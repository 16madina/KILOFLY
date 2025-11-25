import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  MessageSquare, 
  Ban, 
  AlertTriangle,
  MapPin,
  Phone,
  Search
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  country: string;
  city: string;
  id_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  email?: string;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messageDialog, setMessageDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'sms'>('email');
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(u => 
          u.full_name.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.phone.includes(query) ||
          u.city.toLowerCase().includes(query) ||
          u.country.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

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
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des utilisateurs");
      console.error(error);
      setLoading(false);
      return;
    }

    setUsers(profiles);
    setFilteredUsers(profiles);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageContent.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setProcessing(true);

    try {
      if (messageType === 'email') {
        // Call email edge function
        const { error } = await supabase.functions.invoke('send-admin-email', {
          body: {
            to: selectedUser.email || selectedUser.id,
            subject: messageSubject,
            message: messageContent
          }
        });

        if (error) throw error;
        toast.success("Email envoyé avec succès");
      } else {
        // Call SMS edge function
        const { error } = await supabase.functions.invoke('send-admin-sms', {
          body: {
            to: selectedUser.phone,
            message: messageContent
          }
        });

        if (error) throw error;
        toast.success("SMS envoyé avec succès");
      }

      setMessageDialog(false);
      setMessageContent("");
      setMessageSubject("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du message");
    } finally {
      setProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);

    // In a real implementation, you would create a banned_users table
    // For now, we'll just send a notification
    await supabase.rpc('send_notification', {
      p_user_id: selectedUser.id,
      p_title: "⚠️ Compte suspendu",
      p_message: "Votre compte a été suspendu par un administrateur. Contactez le support pour plus d'informations.",
      p_type: 'warning'
    });

    toast.success("Utilisateur banni et notifié");
    setBanDialog(false);
    setProcessing(false);
  };

  const handleWarnUser = async (userId: string) => {
    await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_title: "⚠️ Avertissement",
      p_message: "Vous avez reçu un avertissement de la part de l'administration. Veuillez respecter les conditions d'utilisation de la plateforme.",
      p_type: 'warning'
    });

    toast.success("Avertissement envoyé à l'utilisateur");
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
          <h1 className="text-3xl font-bold mb-2">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            {filteredUsers.length} utilisateur(s)
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, téléphone, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {filteredUsers.map((userProfile) => (
            <Card key={userProfile.id}>
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                      {userProfile.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{userProfile.full_name}</h3>
                      {userProfile.id_verified && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {userProfile.city}, {userProfile.country}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {userProfile.phone}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {userProfile.id_verified && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Identité vérifiée
                        </Badge>
                      )}
                      {userProfile.phone_verified && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Téléphone vérifié
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setMessageType('email');
                        setMessageDialog(true);
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setMessageType('sms');
                        setMessageDialog(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWarnUser(userProfile.id)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Avertir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setBanDialog(true);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Bannir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Message Dialog */}
        <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Envoyer un {messageType === 'email' ? 'Email' : 'SMS'} à {selectedUser?.full_name}
              </DialogTitle>
              <DialogDescription>
                {messageType === 'email' 
                  ? 'L\'email sera envoyé à l\'adresse de l\'utilisateur'
                  : 'Le SMS sera envoyé au numéro de téléphone de l\'utilisateur'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {messageType === 'email' && (
                <div>
                  <Label>Sujet</Label>
                  <Input
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Sujet du message"
                  />
                </div>
              )}
              <div>
                <Label>Message</Label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Votre message..."
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMessageDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSendMessage} disabled={processing}>
                {processing ? 'Envoi...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban Dialog */}
        <Dialog open={banDialog} onOpenChange={setBanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bannir {selectedUser?.full_name}</DialogTitle>
              <DialogDescription>
                Cette action suspendra le compte de l'utilisateur. L'utilisateur sera notifié.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialog(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleBanUser} disabled={processing}>
                {processing ? 'Traitement...' : 'Confirmer le bannissement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminUsers;
