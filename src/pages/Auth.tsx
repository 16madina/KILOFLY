import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AvatarUpload from "@/components/AvatarUpload";
import { z } from "zod";

// Validation schema - avatar validation removed since upload happens after signup
const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().min(10, "Numéro de téléphone invalide").max(20),
  country: z.string().trim().min(2, "Pays requis").max(100),
  city: z.string().trim().min(2, "Ville requise").max(100),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, "Vous devez accepter les conditions")
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupCountry, setSignupCountry] = useState("");
  const [signupCity, setSignupCity] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupAvatar, setSignupAvatar] = useState("");
  const [signupAvatarFile, setSignupAvatarFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(error.message || "Erreur lors de la connexion");
    } else {
      toast.success("Connexion réussie!");
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate avatar file
      if (!signupAvatarFile) {
        toast.error("Photo de profil requise");
        setIsLoading(false);
        return;
      }

      // Validate other fields
      const validationData = {
        fullName: signupFullName,
        email: signupEmail,
        phone: signupPhone,
        country: signupCountry,
        city: signupCity,
        password: signupPassword,
        confirmPassword: signupConfirm,
        termsAccepted
      };
      const validation = signupSchema.safeParse(validationData);
      
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setIsLoading(false);
        return;
      }

      // Create user account first
      const redirectUrl = `${window.location.origin}/profile`;
      
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupFullName,
            phone: signupPhone,
            country: signupCountry,
            city: signupCity,
            avatar_url: '', // Will be updated after upload
            terms_accepted: true
          }
        }
      });

      if (signUpError) {
        toast.error(signUpError.message || "Erreur lors de l'inscription");
        setIsLoading(false);
        return;
      }

      // Now upload avatar with authenticated user
      if (data.user && signupAvatarFile) {
        const fileExt = signupAvatarFile.name.split('.').pop();
        const filePath = `${data.user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, signupAvatarFile, { upsert: true });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          toast.warning('Compte créé mais erreur lors de l\'upload de la photo');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          // Update profile with avatar URL
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', data.user.id);
        }
      }

      toast.success("Compte créé avec succès! Redirection vers votre profil...");
      
      // Wait a bit for the profile to be created
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container flex items-center justify-center py-12 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Bienvenue sur{" "}
              <span className="bg-gradient-sky bg-clip-text text-transparent">
                KiloShare
              </span>
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder à toutes les fonctionnalités
            </p>
          </div>

          <Card className="shadow-hover">
            <CardHeader>
              <CardTitle>Authentification</CardTitle>
              <CardDescription>
                Connectez-vous ou créez un nouveau compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-sky hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <AvatarUpload 
                      value={signupAvatar}
                      onChange={setSignupAvatar}
                      userName={signupFullName || "U"}
                      onFileSelect={setSignupAvatarFile}
                    />
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nom complet *</Label>
                      <Input
                        id="signup-name"
                        placeholder="Jean Dupont"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Téléphone *</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-country">Pays *</Label>
                        <Input
                          id="signup-country"
                          placeholder="France"
                          value={signupCountry}
                          onChange={(e) => setSignupCountry(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-city">Ville *</Label>
                        <Input
                          id="signup-city"
                          placeholder="Paris"
                          value={signupCity}
                          onChange={(e) => setSignupCity(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Minimum 6 caractères"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmer le mot de passe *</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                        required
                      />
                      <label
                        htmlFor="terms"
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        J'accepte la{" "}
                        <a href="/privacy" className="text-primary hover:underline">
                          politique de confidentialité
                        </a>{" "}
                        et les{" "}
                        <a href="/terms" className="text-primary hover:underline">
                          conditions d'utilisation
                        </a>
                        {" "}*
                      </label>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-sky hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? "Création..." : "Créer un compte"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
