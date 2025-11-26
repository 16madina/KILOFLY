import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, User, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email?: string;
}

const emailTemplates = {
  custom: "Message personnalisé",
  warning: "Avertissement",
  welcome: "Bienvenue",
  verification: "Vérification requise",
  update: "Mise à jour importante"
};

const templateContents: Record<string, { subject: string; body: string }> = {
  warning: {
    subject: "⚠️ Avertissement - KiloFly",
    body: "Bonjour,\n\nNous vous contactons pour vous informer que votre comportement sur KiloFly nécessite notre attention.\n\nVeuillez respecter nos conditions d'utilisation pour continuer à profiter de nos services.\n\nCordialement,\nL'équipe KiloFly"
  },
  welcome: {
    subject: "🎉 Bienvenue sur KiloFly !",
    body: "Bonjour,\n\nNous sommes ravis de vous accueillir sur KiloFly, la plateforme qui connecte voyageurs et expéditeurs !\n\nN'hésitez pas à explorer toutes les fonctionnalités et à nous contacter si vous avez des questions.\n\nBon voyage avec KiloFly !\n\nCordialement,\nL'équipe KiloFly"
  },
  verification: {
    subject: "🔒 Vérification d'identité requise - KiloFly",
    body: "Bonjour,\n\nPour utiliser pleinement toutes les fonctionnalités de KiloFly et publier des annonces, veuillez compléter la vérification de votre identité dans votre profil.\n\nCette étape est essentielle pour garantir la sécurité de tous nos utilisateurs.\n\nCordialement,\nL'équipe KiloFly"
  },
  update: {
    subject: "📢 Mise à jour importante - KiloFly",
    body: "Bonjour,\n\nNous souhaitons vous informer d'une mise à jour importante concernant la plateforme KiloFly.\n\n[Ajoutez ici les détails de la mise à jour]\n\nMerci de votre confiance.\n\nCordialement,\nL'équipe KiloFly"
  }
};

const AdminEmail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"single" | "multiple">("single");
  const [singleRecipientEmail, setSingleRecipientEmail] = useState("");
  
  // Users selection
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (selectedTemplate !== "custom" && templateContents[selectedTemplate]) {
      setSubject(templateContents[selectedTemplate].subject);
      setMessage(templateContents[selectedTemplate].body);
    }
  }, [selectedTemplate]);

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
      .select('id, full_name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Erreur lors du chargement des utilisateurs");
      console.error(error);
    } else {
      setUsers(profiles || []);
    }

    setLoading(false);
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

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Veuillez remplir le sujet et le message");
      return;
    }

    if (recipientType === "single") {
      if (!singleRecipientEmail.trim()) {
        toast.error("Veuillez saisir une adresse email");
        return;
      }
    } else {
      if (selectedUsers.size === 0) {
        toast.error("Veuillez sélectionner au moins un utilisateur");
        return;
      }
    }

    setProcessing(true);

    try {
      if (recipientType === "single") {
        const { error } = await supabase.functions.invoke('send-admin-email', {
          body: {
            to: singleRecipientEmail,
            subject: subject,
            message: message
          }
        });

        if (error) throw error;
        
        toast.success("Email envoyé avec succès");
      } else {
        const selectedUsersList = Array.from(selectedUsers)
          .map(id => users.find(u => u.id === id))
          .filter(Boolean) as UserProfile[];

        let successCount = 0;
        let errorCount = 0;

        for (const userProfile of selectedUsersList) {
          const { error } = await supabase.functions.invoke('send-admin-email', {
            body: {
              to: userProfile.email || userProfile.id,
              subject: subject,
              message: message
            }
          });

          if (error) {
            errorCount++;
            console.error(`Error sending to ${userProfile.full_name}:`, error);
          } else {
            successCount++;
            
            // Log admin action
            await supabase.from('admin_actions').insert({
              admin_id: user!.id,
              action_type: 'email',
              target_user_id: userProfile.id,
              details: message,
              email_template: selectedTemplate !== "custom" ? selectedTemplate : null
            });
          }
        }

        if (errorCount > 0) {
          toast.warning(`Emails envoyés: ${successCount}, Erreurs: ${errorCount}`);
        } else {
          toast.success(`Emails envoyés avec succès à ${successCount} utilisateur(s)`);
        }
      }

      // Reset form
      setSubject("");
      setMessage("");
      setSingleRecipientEmail("");
      setSelectedUsers(new Set());
      setSelectedTemplate("custom");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Envoi d'Emails Administrateur
          </h1>
          <p className="text-muted-foreground">
            Envoyez des emails à vos utilisateurs avec des templates prédéfinis ou des messages personnalisés
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Email Composer */}
          <Card>
            <CardHeader>
              <CardTitle>Composer l'Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(emailTemplates).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Type */}
              <div className="space-y-2">
                <Label>Destinataires</Label>
                <div className="flex gap-4">
                  <Button
                    variant={recipientType === "single" ? "default" : "outline"}
                    onClick={() => setRecipientType("single")}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Un seul
                  </Button>
                  <Button
                    variant={recipientType === "multiple" ? "default" : "outline"}
                    onClick={() => setRecipientType("multiple")}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Multiple
                  </Button>
                </div>
              </div>

              {/* Single Recipient Email */}
              {recipientType === "single" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="utilisateur@exemple.com"
                    value={singleRecipientEmail}
                    onChange={(e) => setSingleRecipientEmail(e.target.value)}
                  />
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  placeholder="Sujet de l'email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Contenu de votre message..."
                  rows={12}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {message.length} caractères
                </p>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendEmail}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer l'Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* User Selection (for multiple recipients) */}
          {recipientType === "multiple" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sélection des Utilisateurs</span>
                  <Badge variant="secondary">
                    {selectedUsers.size} sélectionné(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Select All */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={selectAllUsers}
                  />
                  <label
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={selectAllUsers}
                  >
                    Sélectionner tous ({filteredUsers.length})
                  </label>
                </div>

                {/* Users List */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredUsers.map((userProfile) => (
                    <div
                      key={userProfile.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleUserSelection(userProfile.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.has(userProfile.id)}
                        onCheckedChange={() => toggleUserSelection(userProfile.id)}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile.avatar_url} />
                        <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                          {userProfile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{userProfile.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {userProfile.email || userProfile.id}
                        </p>
                      </div>
                      {selectedUsers.has(userProfile.id) && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview (for single recipient) */}
          {recipientType === "single" && (
            <Card>
              <CardHeader>
                <CardTitle>Prévisualisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">De:</p>
                    <p className="font-medium">KiloFly Admin &lt;admin@kilofly.com&gt;</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">À:</p>
                    <p className="font-medium">{singleRecipientEmail || "non spécifié"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sujet:</p>
                    <p className="font-medium">{subject || "Pas de sujet"}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Message:</p>
                    <div className="whitespace-pre-wrap text-sm p-4 bg-background rounded">
                      {message || "Pas de message"}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    💡 <strong>Conseil:</strong> Vérifiez toujours le contenu avant d'envoyer un email. Les emails sont envoyés immédiatement et ne peuvent pas être annulés.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmail;
