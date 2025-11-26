import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Receipt, ShieldCheck, AlertTriangle, TrendingUp, Mail, Ban, UserX } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  totalListings: number;
  activeListings: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingReports: number;
  totalBanned: number;
}

interface ChartData {
  date: string;
  emails: number;
  bans: number;
  warnings: number;
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string | null;
  banned_at: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerifications: 0,
    totalListings: 0,
    activeListings: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingReports: 0,
    totalBanned: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [showBannedDialog, setShowBannedDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      toast.error("Accès refusé: Réservé aux administrateurs");
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchStats();
    fetchChartData();
    fetchBannedUsers();
  };

  const fetchStats = async () => {
    setLoading(true);

    // Total users
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Verified users
    const { count: verifiedCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('id_verified', true);

    // Pending verifications
    const { count: pendingVerifications } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('id_document_url', 'is', null)
      .eq('id_verified', false);

    // Total listings
    const { count: listingsCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    // Active listings
    const { count: activeListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, platform_commission, status');

    const totalTransactions = transactions?.length || 0;
    const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.platform_commission), 0) || 0;

    // Pending reports
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Banned users
    const { count: bannedCount } = await supabase
      .from('banned_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    setStats({
      totalUsers: usersCount || 0,
      verifiedUsers: verifiedCount || 0,
      pendingVerifications: pendingVerifications || 0,
      totalListings: listingsCount || 0,
      activeListings: activeListings || 0,
      totalTransactions,
      totalRevenue,
      pendingReports: reportsCount || 0,
      totalBanned: bannedCount || 0
    });

    setLoading(false);
  };

  const fetchChartData = async () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'dd MMM', { locale: fr }),
        startDate: startOfDay(date),
        endDate: endOfDay(date)
      };
    });

    const chartDataPromises = last7Days.map(async ({ date, startDate, endDate }) => {
      const { count: emails } = await supabase
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'email')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: bans } = await supabase
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'ban')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: warnings } = await supabase
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'warn')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      return {
        date,
        emails: emails || 0,
        bans: bans || 0,
        warnings: warnings || 0
      };
    });

    const data = await Promise.all(chartDataPromises);
    setChartData(data);
  };

  const fetchBannedUsers = async () => {
    const { data: banned } = await supabase
      .from('banned_users')
      .select('*')
      .eq('is_active', true)
      .order('banned_at', { ascending: false });

    if (banned && banned.length > 0) {
      const userIds = banned.map(b => b.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedBanned = banned.map(ban => ({
        ...ban,
        profiles: profileMap.get(ban.user_id) || { full_name: 'Utilisateur inconnu' }
      }));

      setBannedUsers(enrichedBanned);
    } else {
      setBannedUsers([]);
    }
  };

  const handleUnban = async (bannedUserId: string, userId: string) => {
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('banned_users')
        .update({ 
          is_active: false,
          unbanned_at: new Date().toISOString()
        })
        .eq('id', bannedUserId);

      if (error) throw error;

      // Send notification to user
      await supabase.rpc('send_notification', {
        p_user_id: userId,
        p_title: "✅ Compte réactivé",
        p_message: "Votre compte a été réactivé par l'administration.",
        p_type: 'success'
      });

      toast.success("Utilisateur débanni avec succès");
      fetchBannedUsers();
      fetchStats();
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      toast.error("Erreur lors du débannissement");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Panneau d'Administration</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble et gestion de la plateforme KiloFly
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.verifiedUsers} vérifiés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annonces</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeListings} actives
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} $</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerifications + stats.pendingReports}</div>
              <p className="text-xs text-muted-foreground">
                Vérifications & signalements
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowBannedDialog(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bannis</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.totalBanned}</div>
              <p className="text-xs text-muted-foreground">
                Voir la liste
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Actions Admin (7 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emails" stroke="#3b82f6" name="Emails" />
                  <Line type="monotone" dataKey="warnings" stroke="#f59e0b" name="Avertissements" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Bannissements (7 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bans" fill="#ef4444" name="Bannissements" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/admin/email">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Envoi d'Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Envoyer des emails à vos utilisateurs avec Resend
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/users">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des Utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Voir tous les utilisateurs, bannir, envoyer des messages
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/listings">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Gestion des Annonces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Voir toutes les annonces, modérer, supprimer
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/verification">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Vérification d'Identité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingVerifications} documents en attente
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/transactions">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Transactions & Revenus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Voir les paiements et commissions
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/reports">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Signalements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingReports} signalements en attente
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Banned Users Dialog */}
        <Dialog open={showBannedDialog} onOpenChange={setShowBannedDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                Utilisateurs bannis ({bannedUsers.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {bannedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun utilisateur banni
                </p>
              ) : (
                bannedUsers.map((banned) => (
                  <Card key={banned.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{banned.profiles?.full_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Banni le: {format(new Date(banned.banned_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                          {banned.reason && (
                            <p className="text-sm mt-2 bg-muted p-2 rounded">
                              Raison: {banned.reason}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnban(banned.id, banned.user_id)}
                          disabled={processing}
                        >
                          Débannir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
