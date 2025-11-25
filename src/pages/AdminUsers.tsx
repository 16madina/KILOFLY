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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  MessageSquare, 
  Ban, 
  AlertTriangle,
  MapPin,
  Phone,
  Search,
  Users,
  History
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AdminAction {
  id: string;
  action_type: string;
  target_user_id: string;
  details: string | null;
  email_template: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

const emailTemplates = {
  warning: "Avertissement\n\nBonjour,\n\nNous vous contactons pour vous informer que votre comportement sur KiloFly nécessite notre attention. Veuillez respecter nos conditions d'utilisation.\n\nCordialement,\nL'équipe KiloFly",
  ban: "Suspension de compte\n\nBonjour,\n\nNous regrettons de vous informer que votre compte a été suspendu pour violation de nos conditions d'utilisation.\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez nous contacter.\n\nCordialement,\nL'équipe KiloFly",
  welcome: "Bienvenue sur KiloFly\n\nBonjour,\n\nNous sommes ravis de vous accueillir sur KiloFly ! N'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\nL'équipe KiloFly",
  verification: "Vérification requise\n\nBonjour,\n\nPour utiliser pleinement KiloFly, veuillez compléter la vérification de votre identité dans votre profil.\n\nCordialement,\nL'équipe KiloFly"
};

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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState("");
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);

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
    fetchAdminActions();
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

  const fetchAdminActions = async () => {
    const { data: actions, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching admin actions:", error);
      return;
    }

    // Fetch profiles separately
    if (actions && actions.length > 0) {
      const userIds = [...new Set(actions.map(a => a.target_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedActions = actions.map(action => ({
        ...action,
        profiles: profileMap.get(action.target_user_id) || { full_name: 'Utilisateur inconnu' }
      }));

      setAdminActions(enrichedActions);
    } else {
      setAdminActions([]);
    }
  };

  const logAdminAction = async (actionType: string, targetUserId: string, details?: string, template?: string) => {
    if (!user) return;

    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action_type: actionType,
      target_user_id: targetUserId,
      details: details || null,
      email_template: template || null
    });

    fetchAdminActions();
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageContent.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setProcessing(true);

    try {
      if (messageType === 'email') {
        const { error } = await supabase.functions.invoke('send-admin-email', {
          body: {
            to: selectedUser.email || selectedUser.id,
            subject: messageSubject,
            message: messageContent
          }
        });

        if (error) throw error;
        await logAdminAction('email', selectedUser.id, messageContent, emailTemplate || undefined);
        toast.success("Email envoyé avec succès");
      } else {
        const { error } = await supabase.functions.invoke('send-admin-sms', {
          body: {
            to: selectedUser.phone,
            message: messageContent
          }
        });

        if (error) throw error;
        await logAdminAction('sms', selectedUser.id, messageContent);
        toast.success("SMS envoyé avec succès");
      }

      setMessageDialog(false);
      setMessageContent("");
      setMessageSubject("");
      setEmailTemplate("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du message");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkEmail = async () => {
    if (selectedUsers.size === 0 || !messageContent.trim()) {
      toast.error("Veuillez sélectionner des utilisateurs et saisir un message");
      return;
    }

    setProcessing(true);

    try {
      const selectedUsersList = Array.from(selectedUsers)
        .map(id => users.find(u => u.id === id))
        .filter(Boolean) as UserProfile[];

      for (const userProfile of selectedUsersList) {
        const { error } = await supabase.functions.invoke('send-admin-email', {
          body: {
            to: userProfile.email || userProfile.id,
            subject: messageSubject || "Message de l'administration KiloFly",
            message: messageContent
          }
        });

        if (!error) {
          await logAdminAction('email', userProfile.id, messageContent, emailTemplate || undefined);
        }
      }

      toast.success(`Emails envoyés à ${selectedUsers.size} utilisateur(s)`);
      setBulkDialog(false);
      setMessageContent("");
      setMessageSubject("");
      setEmailTemplate("");
      setSelectedUsers(new Set());
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi des emails");
    } finally {
      setProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);

    await supabase.rpc('send_notification', {
      p_user_id: selectedUser.id,
      p_title: "⚠️ Compte suspendu",
      p_message: "Votre compte a été suspendu par un administrateur. Contactez le support pour plus d'informations.",
      p_type: 'warning'
    });

    await logAdminAction('ban', selectedUser.id, 'Compte suspendu');
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

    await logAdminAction('warn', userId, 'Avertissement envoyé');
    toast.success("Avertissement envoyé à l'utilisateur");
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleTemplateSelect = (value: string) => {
    setEmailTemplate(value);
    if (value && emailTemplates[value as keyof typeof emailTemplates]) {
      setMessageContent(emailTemplates[value as keyof typeof emailTemplates]);
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
          <h1 className="text-3xl font-bold mb-2">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            {filteredUsers.length} utilisateur(s)
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Search and Bulk Actions */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedUsers.size > 0 && (
                <Button onClick={() => setBulkDialog(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer à {selectedUsers.size}
                </Button>
              )}
            </div>

            {/* Select All */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={selectAllUsers}
                />
                <label className="text-sm text-muted-foreground cursor-pointer" onClick={selectAllUsers}>
                  Sélectionner tous les utilisateurs ({filteredUsers.length})
                </label>
              </div>
            )}

            {/* Users List */}
            <div className="grid gap-4">
              {filteredUsers.map((userProfile) => (
                <Card key={userProfile.id}>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedUsers.has(userProfile.id)}
                        onCheckedChange={() => toggleUserSelection(userProfile.id)}
                      />
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
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="py-6">
                <h2 className="text-xl font-bold mb-4">Historique des actions administratives</h2>
                <div className="space-y-4">
                  {adminActions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucune action enregistrée</p>
                  ) : (
                    adminActions.map((action) => (
                      <div key={action.id} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">
                              {action.action_type === 'email' && '📧 Email envoyé'}
                              {action.action_type === 'sms' && '📱 SMS envoyé'}
                              {action.action_type === 'ban' && '🚫 Utilisateur banni'}
                              {action.action_type === 'warn' && '⚠️ Avertissement'}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">
                              À: {action.profiles?.full_name}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        {action.email_template && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Modèle: {action.email_template}
                          </p>
                        )}
                        {action.details && (
                          <p className="text-sm bg-muted p-2 rounded mt-2 whitespace-pre-wrap">{action.details}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Single Message Dialog */}
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
                <>
                  <div>
                    <Label>Modèle (optionnel)</Label>
                    <Select value={emailTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Avertissement</SelectItem>
                        <SelectItem value="ban">Suspension</SelectItem>
                        <SelectItem value="welcome">Bienvenue</SelectItem>
                        <SelectItem value="verification">Vérification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sujet</Label>
                    <Input
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      placeholder="Sujet du message"
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Message</Label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Votre message..."
                  rows={6}
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

        {/* Bulk Email Dialog */}
        <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Envoyer un email à {selectedUsers.size} utilisateur(s)
              </DialogTitle>
              <DialogDescription>
                L'email sera envoyé à tous les utilisateurs sélectionnés
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Modèle (optionnel)</Label>
                <Select value={emailTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="ban">Suspension</SelectItem>
                    <SelectItem value="welcome">Bienvenue</SelectItem>
                    <SelectItem value="verification">Vérification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sujet</Label>
                <Input
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Sujet du message"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Votre message..."
                  rows={8}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleBulkEmail} disabled={processing}>
                {processing ? 'Envoi...' : 'Envoyer à tous'}
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
