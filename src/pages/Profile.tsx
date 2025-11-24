import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, Phone, Mail, Upload, CheckCircle, Clock, XCircle, Shield, Star, AlertTriangle, Edit } from "lucide-react";
import { toast } from "sonner";
import { TrustScore } from "@/components/TrustScore";
import { ProfileStats } from "@/components/ProfileStats";
import { ReviewCard } from "@/components/ReviewCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import AvatarUpload from "@/components/AvatarUpload";

interface Profile {
  full_name: string;
  avatar_url: string;
  phone: string;
  country: string;
  city: string;
  id_document_url: string | null;
  id_verified: boolean;
  id_submitted_at: string | null;
  bio: string | null;
  phone_verified: boolean;
  response_rate: number;
  avg_response_time: number | null;
  completed_trips: number;
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchProfile();
    checkAdminRole();
    fetchReviews();
  }, [user, navigate]);

  const checkAdminRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

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
      setBioText(data.bio || "");
    }

    setLoading(false);
  };

  const fetchReviews = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
      `)
      .eq("reviewed_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    }
  };

  const calculateTrustScore = () => {
    if (!profile) return 0;
    let score = 0;
    
    if (profile.id_verified) score += 30;
    if (profile.phone_verified) score += 10;
    if (user?.email_confirmed_at) score += 10;
    
    score += Math.min(reviews.length * 5, 25);
    
    const monthsSinceMember = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    score += Math.min(monthsSinceMember * 5, 15);
    
    score += Math.min(profile.completed_trips * 10, 30);
    
    return Math.min(score, 100);
  };

  const updateBio = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ bio: bioText })
      .eq("id", user.id);

    if (error) {
      toast.error("Impossible de mettre à jour la bio");
      return;
    }

    setProfile({ ...profile!, bio: bioText });
    setEditingBio(false);
    toast.success("Bio mise à jour avec succès");
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
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        {/* Admin Panel Link */}
        {isAdmin && (
          <Card className="mb-6 bg-gradient-primary border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                  <div>
                    <h3 className="font-semibold text-primary-foreground">Panneau d'administration</h3>
                    <p className="text-sm text-primary-foreground/80">Gérer les vérifications d'identité</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/admin/verification')}
                  variant="secondary"
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Header */}
        <Card className="mb-6 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-24 w-24 border-4 border-primary/20 transition-all duration-200 hover:scale-105">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-sky text-primary-foreground text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  <VerifiedBadge verified={profile.id_verified} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
                
                {averageRating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">{averageRating}</span>
                    <span className="text-xs text-muted-foreground">({reviews.length} avis)</span>
                  </div>
                )}
              </div>
            </div>

            <TrustScore score={calculateTrustScore()} />

            {/* Bio Section */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">À propos</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingBio(!editingBio)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                {editingBio ? (
                  <div className="space-y-2">
                    <Textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Parlez de vous..."
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={updateBio} size="sm">Enregistrer</Button>
                      <Button onClick={() => setEditingBio(false)} variant="outline" size="sm">
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {profile.bio || "Aucune description pour le moment"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <ProfileStats
              memberSince={profile.created_at}
              completedTrips={profile.completed_trips}
              responseRate={profile.response_rate}
              avgResponseTime={profile.avg_response_time}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identity">Identité</TabsTrigger>
            <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
            <TabsTrigger value="info">Infos</TabsTrigger>
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

          <TabsContent value="reviews" className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun avis pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="info" className="mt-6 space-y-4">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <Link to="/prohibited-items">
                  <Button variant="ghost" className="w-full justify-start text-destructive">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Voir les articles interdits
                  </Button>
                </Link>
              </CardContent>
            </Card>

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