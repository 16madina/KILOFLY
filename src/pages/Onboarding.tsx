import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Mail, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VerificationStatus {
  emailVerified: boolean;
  idVerified: boolean;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>({
    emailVerified: false,
    idVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchVerificationStatus();
  }, [user, navigate]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      // Check email verification
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const emailVerified = currentUser?.email_confirmed_at != null;

      // Check ID verification
      const { data: profile } = await supabase
        .from("profiles")
        .select("id_verified")
        .eq("id", user.id)
        .single();

      setStatus({
        emailVerified,
        idVerified: profile?.id_verified || false,
      });
    } catch (error) {
      console.error("Error fetching verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) return;
    
    setResendingEmail(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    });
    
    if (error) {
      toast.error("Erreur lors de l'envoi de l'email");
    } else {
      toast.success("Email de vérification envoyé ! Vérifiez votre boîte de réception.");
    }
    
    setResendingEmail(false);
  };

  const calculateProgress = () => {
    let completed = 0;
    if (status.emailVerified) completed += 50;
    if (status.idVerified) completed += 50;
    return completed;
  };

  const isComplete = status.emailVerified && status.idVerified;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container px-4 sm:px-6 py-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bienvenue sur KiloFly</h1>
            <p className="text-sm text-muted-foreground">
              Complétez les vérifications pour accéder à toutes les fonctionnalités
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <Card className="mb-6 animate-fade-in">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progression</span>
                <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              
              {/* Visual Step Tracker */}
              <div className="flex items-center justify-between pt-4">
                {/* Step 1: Email */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      status.emailVerified
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status.emailVerified ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Mail className="w-6 h-6" />
                    )}
                  </motion.div>
                  <span className="text-xs font-medium text-center">Email</span>
                </div>

                {/* Connecting Line */}
                <div className={`h-0.5 flex-1 mx-2 ${
                  status.emailVerified ? "bg-green-500" : "bg-muted"
                }`} />

                {/* Step 2: Identity */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      status.idVerified
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status.idVerified ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Shield className="w-6 h-6" />
                    )}
                  </motion.div>
                  <span className="text-xs font-medium text-center">Identité</span>
                </div>

                {/* Connecting Line */}
                <div className={`h-0.5 flex-1 mx-2 ${
                  isComplete ? "bg-green-500" : "bg-muted"
                }`} />

                {/* Final Step: Complete */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isComplete
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </motion.div>
                  <span className="text-xs font-medium text-center">Terminé</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Email Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.emailVerified ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Vérification Email</CardTitle>
                    <CardDescription>
                      {status.emailVerified
                        ? "Email vérifié avec succès ✓"
                        : "Vérifiez votre adresse email"}
                    </CardDescription>
                  </div>
                </div>
                {status.emailVerified && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            </CardHeader>
            {!status.emailVerified && (
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Nous avons envoyé un email de vérification à <strong>{user?.email}</strong>.
                  Cliquez sur le lien dans l'email pour vérifier votre compte.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full"
                >
                  {resendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Renvoyer l'email
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Step 2: Identity Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status.idVerified ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Vérification d'Identité</CardTitle>
                    <CardDescription>
                      {status.idVerified
                        ? "Identité vérifiée avec succès ✓"
                        : "Téléchargez votre pièce d'identité"}
                    </CardDescription>
                  </div>
                </div>
                {status.idVerified && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            </CardHeader>
            {!status.idVerified && (
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour garantir la sécurité de notre communauté, nous demandons à tous les utilisateurs
                  de vérifier leur identité avec une pièce officielle (passeport, carte d'identité, permis de conduire).
                </p>
                <Button
                  onClick={() => navigate("/verify-identity")}
                  className="w-full bg-gradient-sky"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Vérifier mon identité
                </Button>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Completion Message */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-green-700 dark:text-green-300">
                      Félicitations ! 🎉
                    </CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-400">
                      Votre compte est entièrement vérifié
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  Vous pouvez maintenant profiter de toutes les fonctionnalités de KiloFly :
                  publier des annonces, faire des réservations et communiquer avec la communauté.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Commencer à utiliser KiloFly
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-sm">Besoin d'aide ?</h3>
            <p className="text-sm text-muted-foreground">
              Si vous rencontrez des problèmes avec la vérification, contactez notre support à{" "}
              <a href="mailto:support@kilofly.com" className="text-primary hover:underline">
                support@kilofly.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
