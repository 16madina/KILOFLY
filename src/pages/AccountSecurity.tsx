import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Lock, Mail, Key, FileText, Shield, Download, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AccountSecurity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  const handleEmailChange = async () => {
    toast.info("Fonctionnalité bientôt disponible");
  };

  const handleDataExport = async () => {
    setLoading(true);
    try {
      // Export user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Export user listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user?.id);

      if (listingsError) throw listingsError;

      // Export user transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`);

      if (transactionsError) throw transactionsError;

      const exportData = {
        profile,
        listings,
        transactions,
        exportDate: new Date().toISOString()
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kilofly-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Vos données ont été exportées avec succès");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export des données");
    }
    setLoading(false);
  };

  const handleAccountDeletion = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      setLoading(true);
      try {
        // Request account deletion (admin needs to process)
        const { error } = await supabase.functions.invoke('send-admin-email', {
          body: {
            subject: 'Demande de suppression de compte',
            message: `L'utilisateur ${user?.email} (ID: ${user?.id}) a demandé la suppression de son compte.`
          }
        });

        if (error) throw error;

        toast.success("Demande de suppression envoyée. Un administrateur traitera votre demande sous 30 jours.");
      } catch (error) {
        console.error('Deletion request error:', error);
        toast.error("Erreur lors de la demande de suppression");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Sécurité du compte</h1>
        </div>

        <div className="space-y-6">
          {/* Current Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Adresse email
              </CardTitle>
              <CardDescription>
                Votre adresse email actuelle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base">{user?.email}</span>
                <Button variant="outline" onClick={handleEmailChange}>
                  Modifier
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Modifier le mot de passe
              </CardTitle>
              <CardDescription>
                Changez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Authentification à deux facteurs
              </CardTitle>
              <CardDescription>
                Ajoutez une couche de sécurité supplémentaire à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => toast.info("Fonctionnalité bientôt disponible")}>
                Configurer
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Politique de confidentialité
              </CardTitle>
              <CardDescription>
                Découvrez comment nous protégeons et utilisons vos données personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/privacy')}>
                Consulter la politique
              </Button>
              <Button variant="outline" onClick={() => navigate('/privacy-settings')}>
                Paramètres de confidentialité
              </Button>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Conditions d'utilisation
              </CardTitle>
              <CardDescription>
                Consultez les conditions générales d'utilisation de KiloFly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/terms')}>
                Consulter les conditions
              </Button>
            </CardContent>
          </Card>

          {/* Data Export - GDPR/iOS/Android Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Sauvegarde et export de données
              </CardTitle>
              <CardDescription>
                Téléchargez une copie de toutes vos données personnelles au format JSON (RGPD, iOS App Store, Google Play)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Vos données exportées incluent :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Informations de profil (nom, email, téléphone, localisation)</li>
                  <li>Toutes vos annonces et voyages</li>
                  <li>Historique des transactions</li>
                  <li>Vérifications et badges obtenus</li>
                </ul>
                <p className="mt-3 text-xs">
                  Conforme aux exigences RGPD, iOS App Store et Google Play Store. 
                  Pour toute question : <a href="mailto:privacy@kilofly.com" className="text-primary underline">privacy@kilofly.com</a>
                </p>
              </div>
              <Button onClick={handleDataExport} disabled={loading} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {loading ? "Export en cours..." : "Télécharger mes données"}
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion - GDPR Right to Erasure */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Suppression du compte
              </CardTitle>
              <CardDescription>
                Supprimez définitivement votre compte et toutes vos données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive mb-1">Action irréversible</p>
                    <p className="text-muted-foreground">
                      La suppression de votre compte entraînera la suppression définitive de :
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-2">
                      <li>Votre profil et toutes vos informations personnelles</li>
                      <li>Toutes vos annonces de voyage</li>
                      <li>Vos conversations et messages</li>
                      <li>Votre historique de transactions</li>
                      <li>Vos évaluations et badges de confiance</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Vos données seront supprimées dans un délai de 30 jours conformément au RGPD.
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleAccountDeletion} 
                disabled={loading}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {loading ? "Traitement..." : "Demander la suppression de mon compte"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;
