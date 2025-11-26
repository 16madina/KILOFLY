import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, AlertTriangle, TrendingUp, Clock, FileCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface AnalyticsData {
  totalVerifications: number;
  autoApproved: number;
  aiFlagged: number;
  manualApproved: number;
  manualRejected: number;
  avgProcessingTime: number;
  aiAccuracyRate: number;
}

interface DocumentTypeData {
  type: string;
  count: number;
  flagged: number;
}

const AdminAIAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVerifications: 0,
    autoApproved: 0,
    aiFlagged: 0,
    manualApproved: 0,
    manualRejected: 0,
    avgProcessingTime: 0,
    aiAccuracyRate: 0
  });
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeData[]>([]);

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
    fetchAnalytics();
  };

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      // Total verifications avec document soumis
      const { data: allProfiles, count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .not('id_document_url', 'is', null);

      // Verifications auto-approuvées par l'IA
      const { count: autoApprovedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_method', 'ai_approved');

      // Documents signalés par l'IA
      const { count: aiFlaggedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_method', 'ai_flagged');

      // Verifications manuelles
      const { count: manualApprovedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_method', 'manual_approved');

      const { count: manualRejectedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_method', 'manual_rejected');

      // Calculer le temps moyen de traitement (différence entre soumission et vérification)
      const { data: verifiedProfiles } = await supabase
        .from('profiles')
        .select('id_submitted_at, verified_at')
        .not('verified_at', 'is', null)
        .not('id_submitted_at', 'is', null);

      let avgTime = 0;
      if (verifiedProfiles && verifiedProfiles.length > 0) {
        const totalTime = verifiedProfiles.reduce((sum, profile) => {
          const submitted = new Date(profile.id_submitted_at!);
          const verified = new Date(profile.verified_at!);
          const diff = verified.getTime() - submitted.getTime();
          return sum + diff;
        }, 0);
        avgTime = totalTime / verifiedProfiles.length / (1000 * 60); // en minutes
      }

      // Calculer le taux de précision de l'IA (basé sur le feedback admin)
      const { data: feedbackData } = await supabase
        .from('ai_verification_feedback')
        .select('ai_decision, admin_decision');

      let aiAccuracy = 0;
      if (feedbackData && feedbackData.length > 0) {
        const correctDecisions = feedbackData.filter(
          (fb) =>
            (fb.ai_decision === 'ai_approved' && fb.admin_decision === 'manual_approved') ||
            (fb.ai_decision === 'ai_flagged' && fb.admin_decision === 'manual_rejected')
        );
        aiAccuracy = (correctDecisions.length / feedbackData.length) * 100;
      }

      // Analyser les types de documents signalés
      const { data: flaggedDocs } = await supabase
        .from('profiles')
        .select('verification_notes')
        .eq('verification_method', 'ai_flagged');

      const typeStats: Record<string, { count: number; flagged: number }> = {
        passport: { count: 0, flagged: 0 },
        national_id: { count: 0, flagged: 0 },
        drivers_license: { count: 0, flagged: 0 },
        unknown: { count: 0, flagged: 0 }
      };

      allProfiles?.forEach((profile) => {
        const notes = profile.verification_notes || '';
        let detectedType = 'unknown';
        
        if (notes.includes('passport')) detectedType = 'passport';
        else if (notes.includes('national_id')) detectedType = 'national_id';
        else if (notes.includes('drivers_license')) detectedType = 'drivers_license';

        typeStats[detectedType].count++;
        
        if (profile.verification_method === 'ai_flagged') {
          typeStats[detectedType].flagged++;
        }
      });

      const docTypes: DocumentTypeData[] = Object.entries(typeStats)
        .map(([type, stats]) => ({
          type: type === 'passport' ? 'Passeport' : 
                type === 'national_id' ? 'Carte d\'identité' :
                type === 'drivers_license' ? 'Permis de conduire' : 'Inconnu',
          count: stats.count,
          flagged: stats.flagged
        }))
        .filter(d => d.count > 0);

      setAnalytics({
        totalVerifications: totalCount || 0,
        autoApproved: autoApprovedCount || 0,
        aiFlagged: aiFlaggedCount || 0,
        manualApproved: manualApprovedCount || 0,
        manualRejected: manualRejectedCount || 0,
        avgProcessingTime: avgTime,
        aiAccuracyRate: aiAccuracy
      });

      setDocumentTypes(docTypes);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
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

  const approvalRate = analytics.totalVerifications > 0
    ? ((analytics.autoApproved / analytics.totalVerifications) * 100).toFixed(1)
    : '0';

  const pieData = [
    { name: 'Auto-approuvé', value: analytics.autoApproved, color: '#10b981' },
    { name: 'Signalé IA', value: analytics.aiFlagged, color: '#f59e0b' },
    { name: 'Approuvé manuel', value: analytics.manualApproved, color: '#3b82f6' },
    { name: 'Rejeté manuel', value: analytics.manualRejected, color: '#ef4444' }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Analytics IA - Vérification d'Identité
          </h1>
          <p className="text-muted-foreground">
            Statistiques et performance du système de vérification automatique
          </p>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux d'Approbation Auto</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvalRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.autoApproved} / {analytics.totalVerifications} documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {analytics.avgProcessingTime.toFixed(0)}min
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Traitement automatique
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Signalés</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{analytics.aiFlagged}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Nécessitent révision manuelle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision IA</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {analytics.aiAccuracyRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Basé sur feedback admin
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Distribution des Vérifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Documents Signalés par Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={documentTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Total" />
                  <Bar dataKey="flagged" fill="#f59e0b" name="Signalés" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Informations système */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Performance du Système IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold">Réduction de charge admin</p>
                  <p className="text-sm text-muted-foreground">
                    {approvalRate}% des documents traités automatiquement
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                +{approvalRate}% efficacité
              </Badge>
            </div>

            {analytics.aiAccuracyRate > 0 && (
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="font-semibold">Apprentissage continu</p>
                    <p className="text-sm text-muted-foreground">
                      Le système s'améliore avec chaque décision admin
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                  {analytics.aiAccuracyRate.toFixed(0)}% précision
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold">Traitement instantané</p>
                  <p className="text-sm text-muted-foreground">
                    Temps moyen: {analytics.avgProcessingTime.toFixed(0)} minutes
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                Automatique
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAIAnalytics;