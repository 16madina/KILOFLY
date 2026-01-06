import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AvatarUpload from "@/components/AvatarUpload";
import { z } from "zod";
import kiloFlyLogo from "@/assets/kilofly-logo-v2.png";
import { CountrySelect } from "@/components/CountrySelect";
import { CitySelect } from "@/components/CitySelect";
import { UserTypeSelect } from "@/components/UserTypeSelect";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { Fingerprint } from "lucide-react";

// Validation schema - avatar validation removed since upload happens after signup
const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().min(10, "Numéro de téléphone invalide").max(20),
  country: z.string().trim().min(2, "Pays requis").max(100),
  city: z.string().trim().min(2, "Ville requise").max(100),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
  userType: z.enum(['traveler', 'shipper'], { required_error: "Type de compte requis" }),
  termsAccepted: z.boolean().refine(val => val === true, "Vous devez accepter les conditions")
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  
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
  const [signupUserType, setSignupUserType] = useState<"traveler" | "shipper">("traveler");
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { 
    isAvailable: biometricAvailable, 
    isEnabled: biometricEnabled, 
    biometryType,
    authenticate: biometricAuthenticate,
    getCredentials,
    saveCredentials,
    enableBiometric
  } = useBiometricAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Try biometric login on mount if enabled - only once
  const biometricTriedRef = useRef(false);
  
  useEffect(() => {
    const tryBiometricLogin = async () => {
      if (biometricTriedRef.current) return;
      if (!biometricAvailable || !biometricEnabled || user) return;
      
      biometricTriedRef.current = true;
      
      const credentials = await getCredentials();
      if (credentials) {
        const success = await biometricAuthenticate();
        if (success) {
          setIsLoading(true);
          const { error } = await signIn(credentials.email, credentials.password);
          if (error) {
            toast.error("Échec de la connexion biométrique");
          } else {
            toast.success("Connexion biométrique réussie!");
          }
          setIsLoading(false);
        }
      }
    };
    tryBiometricLogin();
  }, [biometricAvailable, biometricEnabled, user, getCredentials, biometricAuthenticate, signIn]);

  const handleBiometricLogin = async () => {
    const credentials = await getCredentials();
    if (!credentials) {
      toast.error("Aucune identification enregistrée. Connectez-vous d'abord avec email/mot de passe.");
      return;
    }

    const success = await biometricAuthenticate();
    if (success) {
      setIsLoading(true);
      const { error } = await signIn(credentials.email, credentials.password);
      if (error) {
        toast.error("Échec de la connexion");
      } else {
        toast.success("Connexion réussie!");
      }
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(error.message || "Erreur lors de la connexion");
    } else {
      toast.success("Connexion réussie!");
      
      // Offer to save credentials for biometric login
      if (biometricAvailable && !biometricEnabled) {
        try {
          await saveCredentials({ email: loginEmail, password: loginPassword });
          enableBiometric();
          toast.success(`${biometryType} activé pour les prochaines connexions`);
        } catch (err) {
          console.log('Could not save biometric credentials');
        }
      } else if (biometricAvailable && biometricEnabled) {
        // Update credentials
        await saveCredentials({ email: loginEmail, password: loginPassword });
      }
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: forgotEmail }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.", {
          duration: 6000,
        });
        setShowForgotPassword(false);
        setForgotEmail("");
      } else {
        toast.error(data.error || "Erreur lors de l'envoi");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setForgotLoading(false);
    }
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
        userType: signupUserType,
        termsAccepted
      };
      const validation = signupSchema.safeParse(validationData);
      
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setIsLoading(false);
        return;
      }

      // First, upload avatar to storage (using anon key, will be linked after user creation)
      const fileExt = signupAvatarFile.name.split('.').pop();
      const tempFilePath = `temp/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(tempFilePath, signupAvatarFile, { upsert: true });

      let avatarUrl = '';
      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(tempFilePath);
        avatarUrl = publicUrl;
      }

      // Call our custom edge function for signup with branded confirmation email
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: signupEmail,
            password: signupPassword,
            fullName: signupFullName,
            phone: signupPhone,
            country: signupCountry,
            city: signupCity,
            userType: signupUserType,
            avatarUrl: avatarUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erreur lors de l'inscription");
        setIsLoading(false);
        return;
      }

      toast.success("Compte créé ! Vérifiez votre email pour confirmer votre inscription.", {
        duration: 6000,
      });
      
      // Navigate back to auth page to show login tab
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <div className="container px-4 sm:px-6 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex justify-center mb-4">
              <img 
                src={kiloFlyLogo} 
                alt="KiloFly" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder à toutes les fonctionnalités
            </p>
          </div>

          <Card className="shadow-hover animate-scale-in">
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
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="transition-all duration-200 focus:scale-[1.02]"
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
                        className="transition-all duration-200 focus:scale-[1.02]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline mt-1"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-sky hover:opacity-90 transition-all duration-200 hover:scale-[1.02] mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Button>

                    {biometricAvailable && biometricEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-3 flex items-center justify-center gap-2"
                        onClick={handleBiometricLogin}
                        disabled={isLoading}
                      >
                        <Fingerprint className="h-5 w-5" />
                        Connexion avec {biometryType}
                      </Button>
                    )}
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 pt-4 pb-4">
                    <AvatarUpload 
                      value={signupAvatar}
                      onChange={setSignupAvatar}
                      userName={signupFullName || "U"}
                      onFileSelect={setSignupAvatarFile}
                    />
                    
                    <UserTypeSelect
                      value={signupUserType}
                      onChange={(value) => setSignupUserType(value as "traveler" | "shipper")}
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
                    
                    <CountrySelect
                      value={signupCountry}
                      onChange={(country, dialCode) => {
                        setSignupCountry(country);
                        setSignupPhone(dialCode + " ");
                      }}
                      required
                    />
                    
                    <CitySelect
                      countryName={signupCountry}
                      value={signupCity}
                      onChange={setSignupCity}
                      required
                    />
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Téléphone *</Label>
                      <PhoneInput
                        id="signup-phone"
                        international
                        defaultCountry="FR"
                        value={signupPhone}
                        onChange={(value) => setSignupPhone(value || "")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        required
                      />
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
                      className="w-full bg-gradient-sky hover:opacity-90 transition-all duration-200 hover:scale-[1.02] mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? "Création..." : "Créer un compte"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md animate-scale-in">
                <CardHeader>
                  <CardTitle>Mot de passe oublié</CardTitle>
                  <CardDescription>
                    Entrez votre adresse email pour recevoir un lien de réinitialisation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForgotPassword(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={forgotLoading}
                      >
                        {forgotLoading ? "Envoi..." : "Envoyer"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
