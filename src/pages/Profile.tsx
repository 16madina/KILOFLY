import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Phone, Mail, Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  avatar_url: string;
  phone: string;
  country: string;
  city: string;
  id_document_url: string | null;
  id_verified: boolean;
  id_submitted_at: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement du profil");
      console.error(error);
    } else {
      setProfile(data);
    }

    setLoading(false);
  };

  const uploadIdDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Le fichier doit être une image');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 10 MB');
        return;
      }

      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          id_document_url: publicUrl,
          id_submitted_at: new Date().toISOString(),
          id_verified: false
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Document d\'identité soumis pour vérification');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const getVerificationStatus = () => {
    if (!profile?.id_document_url) {
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        text: "Non soumis",
        color: "destructive" as const
      };
    }
    if (profile.id_verified) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: "Vérifié",
        color: "default" as const
      };
    }
    return {
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      text: "En attente",
      color: "secondary" as const
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Profil introuvable</p>
        </div>
      </div>
    );
  }

  const status = getVerificationStatus();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-sky text-primary-foreground text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold mb-2">{profile.full_name}</h1>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.city}, {profile.country}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </div>
                </div>
              </div>
              
              <Badge variant={status.color} className="flex items-center gap-2">
                {status.icon}
                {status.text}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">Vérifier votre identité</TabsTrigger>
            <TabsTrigger value="info">Informations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="identity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Vérification d'identité</CardTitle>
                <CardDescription>
                  Pour la sécurité de tous, nous devons vérifier votre identité. 
                  Téléchargez une photo claire de votre pièce d'identité (carte d'identité, passeport).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.id_document_url ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <img 
                        src={profile.id_document_url} 
                        alt="Document d'identité"
                        className="w-full max-w-md mx-auto rounded"
                      />
                    </div>
                    
                    {profile.id_verified ? (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle className="h-5 w-5" />
                          <p className="font-medium">Identité vérifiée</p>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Votre document a été approuvé par notre équipe
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                          <Clock className="h-5 w-5" />
                          <p className="font-medium">En attente de vérification</p>
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                          Votre document est en cours de vérification. Cela peut prendre jusqu'à 48h.
                        </p>
                      </div>
                    )}
                    
                    <label htmlFor="id-upload">
                      <Button variant="outline" className="w-full" disabled={uploading} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Téléchargement...' : 'Changer le document'}
                        </span>
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        <p className="font-medium">Document non soumis</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vous devez soumettre un document d'identité pour utiliser la plateforme
                      </p>
                    </div>
                    
                    <label htmlFor="id-upload">
                      <Button className="w-full" disabled={uploading} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Téléchargement...' : 'Télécharger mon document'}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
                
                <input
                  id="id-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadIdDocument}
                  disabled={uploading}
                  className="hidden"
                />
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Le document doit être lisible et en couleur</p>
                  <p>• Formats acceptés: JPG, PNG (max 10 MB)</p>
                  <p>• Toutes les informations doivent être visibles</p>
                  <p>• Vos données sont sécurisées et confidentielles</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes informations</CardTitle>
                <CardDescription>
                  Vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                    <p className="text-base">{profile.full_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Pays</label>
                      <p className="text-base">{profile.country}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ville</label>
                      <p className="text-base">{profile.city}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="text-base">{profile.phone}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{user?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;