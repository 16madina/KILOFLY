import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface PendingVerification {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  country: string;
  city: string;
  id_document_url: string;
  id_submitted_at: string;
  email: string;
}

const AdminVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      toast.error("Accès refusé: Réservé aux administrateurs");
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchPendingVerifications();
  };

  const fetchPendingVerifications = async () => {
    setLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('id_document_url', 'is', null)
      .eq('id_verified', false)
      .order('id_submitted_at', { ascending: true });

    if (profilesError) {
      toast.error("Erreur lors du chargement des vérifications");
      console.error(profilesError);
      setLoading(false);
      return;
    }

    // Get user emails from auth.users
    const userIds = profiles.map(p => p.id);
    
    // For now, we'll just use the profiles without emails from auth
    // In production, you would use the Supabase admin API to get user emails
    const profilesWithEmails = profiles.map(profile => ({
      ...profile,
      email: user?.email || 'Non disponible' // Placeholder
    }));

    setPendingVerifications(profilesWithEmails);
    setLoading(false);
  };

  const handleVerification = async (userId: string, approved: boolean) => {
    setProcessing(userId);

    const { error } = await supabase
      .from('profiles')
      .update({ id_verified: approved })
      .eq('id', userId);

    if (error) {
      toast.error("Erreur lors de la vérification");
      console.error(error);
      setProcessing(null);
      return;
    }

    // Send notification to user
    const notificationTitle = approved 
      ? "✅ Identité vérifiée" 
      : "❌ Document rejeté";
    const notificationMessage = approved
      ? "Votre document d'identité a été vérifié avec succès. Vous pouvez maintenant utiliser toutes les fonctionnalités de KiloShare."
      : "Votre document d'identité a été rejeté. Veuillez soumettre un document valide et lisible.";
    const notificationType = approved ? 'success' : 'error';

    await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_title: notificationTitle,
      p_message: notificationMessage,
      p_type: notificationType
    });

    toast.success(approved ? "Document approuvé et utilisateur notifié" : "Document rejeté et utilisateur notifié");
    fetchPendingVerifications();
    setProcessing(null);
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
      
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vérification des identités</h1>
          <p className="text-muted-foreground">
            {pendingVerifications.length} document(s) en attente de vérification
          </p>
        </div>

        {pendingVerifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tout est à jour!</h3>
              <p className="text-muted-foreground">
                Aucun document en attente de vérification
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingVerifications.map((verification) => (
              <Card key={verification.id}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={verification.avatar_url} />
                      <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                        {verification.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <CardTitle className="mb-2">{verification.full_name}</CardTitle>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {verification.city}, {verification.country}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {verification.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {verification.email}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="secondary" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(verification.id_submitted_at).toLocaleDateString('fr-FR')}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <img 
                      src={verification.id_document_url} 
                      alt="Document d'identité"
                      className="w-full max-w-2xl mx-auto rounded"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleVerification(verification.id, true)}
                      disabled={processing === verification.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {processing === verification.id ? 'Traitement...' : 'Approuver'}
                    </Button>
                    
                    <Button
                      onClick={() => handleVerification(verification.id, false)}
                      disabled={processing === verification.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processing === verification.id ? 'Traitement...' : 'Rejeter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVerification;