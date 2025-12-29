import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, CheckCircle2, Clock, XCircle, Loader2, FileCheck, Camera, Shield, PartyPopper, Sparkles } from "lucide-react";
import IDDocumentUpload from "@/components/IDDocumentUpload";
import SelfieCapture from "@/components/SelfieCapture";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface VerificationStatus {
  id_verified: boolean;
  id_document_url: string | null;
  verification_method: string | null;
  verification_notes: string | null;
  ai_confidence_score: number | null;
  avatar_url: string | null;
}

type VerificationStep = 'document' | 'selfie' | 'verifying' | 'complete';

type AIVerificationStage = 
  | 'uploading' 
  | 'sending' 
  | 'analyzing_document' 
  | 'comparing_faces' 
  | 'finalizing';

const AI_STAGES: { id: AIVerificationStage; label: string; duration: number }[] = [
  { id: 'uploading', label: 'Préparation des images...', duration: 1500 },
  { id: 'sending', label: 'Envoi à l\'IA...', duration: 2000 },
  { id: 'analyzing_document', label: 'Analyse du document...', duration: 4000 },
  { id: 'comparing_faces', label: 'Comparaison des visages...', duration: 3000 },
  { id: 'finalizing', label: 'Finalisation...', duration: 1500 },
];

const VerifyIdentity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('document');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [aiStage, setAiStage] = useState<AIVerificationStage>('uploading');
  const [stageProgress, setStageProgress] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchVerificationStatus();
  }, [user, navigate]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id_verified, id_document_url, verification_method, verification_notes, ai_confidence_score, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setStatus(data);
      
      // Determine current step based on status
      if (data.id_verified) {
        setCurrentStep('complete');
      } else if (data.verification_method === 'pending' && data.id_document_url) {
        // Document uploaded with pending status - allow selfie capture
        setDocumentUrl(data.id_document_url);
        setCurrentStep('selfie');
      } else if (data.id_document_url && data.verification_method && data.verification_method !== 'pending') {
        // Document uploaded and being processed (flagged, rejected, etc.)
        setCurrentStep('complete');
      } else if (data.id_document_url && !data.verification_method) {
        // Document uploaded but needs selfie
        setDocumentUrl(data.id_document_url);
        setCurrentStep('selfie');
      } else {
        setCurrentStep('document');
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploaded = async (url: string) => {
    console.log('[VerifyIdentity] Document uploaded:', url);
    setDocumentUrl(url);
    
    // Check if user already has a valid selfie/avatar
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user?.id)
      .single();
    
    const hasValidSelfie = profile?.avatar_url && 
      profile.avatar_url.includes('selfie-') && 
      profile.avatar_url.includes('/avatars/');
    
    if (hasValidSelfie) {
      // User already has a selfie, go directly to AI verification
      console.log('[VerifyIdentity] User has existing selfie, proceeding to verification');
      toast.info('Selfie existant détecté, vérification en cours...');
      handleSelfieComplete(profile.avatar_url);
    } else {
      // Need to capture selfie
      console.log('[VerifyIdentity] No selfie found, proceeding to selfie capture');
      setCurrentStep('selfie');
    }
  };

  // Progress animation for AI stages
  useEffect(() => {
    if (currentStep !== 'verifying') {
      setAiStage('uploading');
      setStageProgress(0);
      return;
    }

    let stageIndex = 0;
    let progressInterval: number;
    let stageTimeout: number;

    const runStage = () => {
      if (stageIndex >= AI_STAGES.length) return;
      
      const stage = AI_STAGES[stageIndex];
      setAiStage(stage.id);
      setStageProgress(0);

      // Animate progress bar for this stage
      const steps = 20;
      const stepDuration = stage.duration / steps;
      let currentProgress = 0;

      progressInterval = window.setInterval(() => {
        currentProgress += 100 / steps;
        setStageProgress(Math.min(currentProgress, 100));
      }, stepDuration);

      // Move to next stage
      stageTimeout = window.setTimeout(() => {
        window.clearInterval(progressInterval);
        setStageProgress(100);
        stageIndex++;
        if (stageIndex < AI_STAGES.length) {
          runStage();
        }
      }, stage.duration);
    };

    runStage();

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(stageTimeout);
    };
  }, [currentStep]);

  const handleSelfieComplete = async (selfieUrl: string) => {
    setCurrentStep('verifying');
    setAiStage('uploading');
    setStageProgress(0);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-id-document', {
        body: {
          userId: user?.id,
          documentUrl: documentUrl,
          selfieUrl,
        },
      });

      if (error) {
        console.error('Verification error:', error);
        toast.warning('⚠️ La vérification automatique a échoué. Un admin vérifiera manuellement.');
      } else if (data?.success) {
        if (data.idVerified) {
          // Show success popup!
          setShowSuccessPopup(true);
        } else if (data.faceComparison?.same_person === false) {
          toast.error('❌ Le visage ne correspond pas au document. Veuillez réessayer avec votre propre document.');
        } else {
          toast.info('⏳ Vérification manuelle requise. Nous vous contacterons sous 24-48h.');
        }
      }
      
      await fetchVerificationStatus();
      setCurrentStep('complete');
      
    } catch (error) {
      console.error('Error during verification:', error);
      toast.error('Erreur lors de la vérification');
      setCurrentStep('complete');
    }
  };

  // Auto-redirect countdown when success popup is shown
  useEffect(() => {
    if (!showSuccessPopup) {
      setRedirectCountdown(5);
      return;
    }
    
    if (redirectCountdown <= 0) {
      setShowSuccessPopup(false);
      navigate('/profile');
      return;
    }
    
    const timer = setTimeout(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [showSuccessPopup, redirectCountdown, navigate]);

  const handleSkipSelfie = async () => {
    setCurrentStep('verifying');
    
    try {
      toast.info('🤖 Vérification du document en cours...');
      
      const { data, error } = await supabase.functions.invoke('verify-id-document', {
        body: {
          userId: user?.id,
          documentUrl: documentUrl,
        },
      });

      if (error) {
        console.error('Verification error:', error);
        toast.warning('⚠️ Vérification manuelle requise.');
      } else if (data?.success) {
        if (data.idVerified) {
          setShowSuccessPopup(true);
        } else {
          toast.info('⏳ Vérification manuelle en cours (24-48h).');
        }
      }
      
      await fetchVerificationStatus();
      setCurrentStep('complete');
      
    } catch (error) {
      console.error('Error:', error);
      setCurrentStep('complete');
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.id_verified) {
      return (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <p className="font-semibold">✅ Identité vérifiée</p>
            <p className="text-sm">Vous pouvez maintenant créer des annonces</p>
          </div>
        </div>
      );
    }

    if (status.verification_method === 'ai_rejected') {
      return (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">❌ Vérification échouée</p>
            <p className="text-sm">Veuillez soumettre un nouveau document</p>
            {status.verification_notes && (
              <p className="text-xs mt-2 opacity-80 whitespace-pre-line">{status.verification_notes}</p>
            )}
          </div>
        </div>
      );
    }

    if (status.verification_method === 'ai_flagged') {
      return (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
          <Clock className="h-5 w-5" />
          <div>
            <p className="font-semibold">⏳ Vérification manuelle en cours</p>
            <p className="text-sm">Notre équipe examine votre dossier (24-48h)</p>
          </div>
        </div>
      );
    }

    if (status.verification_method === 'manual_rejected') {
      return (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">❌ Document rejeté</p>
            <p className="text-sm">Veuillez soumettre un nouveau document</p>
          </div>
        </div>
      );
    }

    // Handle 'pending' status - document uploaded, waiting for selfie or admin review
    if (status.verification_method === 'pending' && status.id_document_url) {
      return (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
          <Clock className="h-5 w-5" />
          <div>
            <p className="font-semibold">⏳ Document en attente de vérification</p>
            <p className="text-sm">Complétez la vérification faciale pour accélérer le processus</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const steps = [
    { id: 'document', label: 'Document', icon: FileCheck },
    { id: 'selfie', label: 'Selfie', icon: Camera },
    { id: 'verifying', label: 'Vérification', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success Popup - rendered globally regardless of currentStep
  const successPopup = (
    <Dialog open={showSuccessPopup} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md text-center" onPointerDownOutside={(e) => e.preventDefault()}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute -top-2 -right-2"
            >
              <PartyPopper className="h-8 w-8 text-yellow-500" />
            </motion.div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Félicitations ! 🎉
            </h2>
            <p className="text-lg text-muted-foreground">
              Votre profil est maintenant complètement validé
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-full">
            <Sparkles className="h-4 w-4" />
            <span>Vous pouvez profiter de toutes les fonctionnalités</span>
          </div>
          
          <div className="mt-4 text-center text-muted-foreground">
            <p className="text-sm">Redirection automatique dans</p>
            <motion.span 
              key={redirectCountdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold text-primary block mt-1"
            >
              {redirectCountdown}s
            </motion.span>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );

  // Show completed state
  if (currentStep === 'complete' && status) {
    return (
      <>
        {successPopup}
        <div className="min-h-screen bg-background pb-24">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
            <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold">Vérification d'identité</h1>
            </div>
          </div>

          <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
            {getStatusBadge()}

            {/* Show upload option if rejected */}
            {(status.verification_method === 'manual_rejected' || status.verification_method === 'ai_rejected') && (
              <IDDocumentUpload 
                documentUrl={status.id_document_url || undefined}
                onUploadComplete={() => {
                  fetchVerificationStatus();
                  setCurrentStep('document');
                }}
              />
            )}

            {/* Help Section */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Besoin d'aide ?</h4>
              <p className="text-sm text-muted-foreground">
                Contactez notre support à{' '}
                <a href="mailto:support@kilofly.com" className="text-primary hover:underline">
                  support@kilofly.com
                </a>
              </p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {successPopup}

      <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Vérification d'identité</h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                      isActive && "bg-primary text-primary-foreground scale-110 shadow-lg",
                      isCompleted && "bg-green-500 text-white",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-green-500",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 mx-2 transition-colors",
                      isCompleted ? "bg-green-500" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            Vérification sécurisée en 2 étapes
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStep === 'document' && "Téléchargez votre pièce d'identité officielle"}
            {currentStep === 'selfie' && "Prenez un selfie pour confirmer votre identité"}
            {currentStep === 'verifying' && "Analyse IA en cours..."}
          </p>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'document' && (
            <motion.div
              key="document"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <IDDocumentUpload 
                documentUrl={status?.id_document_url || undefined}
                onUploadComplete={(url?: string) => {
                  if (url) {
                    handleDocumentUploaded(url);
                  } else {
                    fetchVerificationStatus();
                  }
                }}
              />
            </motion.div>
          )}

          {currentStep === 'selfie' && documentUrl && (
            <div className="animate-fade-in">
              <SelfieCapture
                documentUrl={documentUrl}
                onCaptureComplete={handleSelfieComplete}
                onSkip={handleSkipSelfie}
              />
            </div>
          )}

          {currentStep === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 space-y-8"
            >
              {/* Central animation */}
              <div className="flex justify-center">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/20">
                    <Shield className="h-12 w-12 text-primary animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">
                  Vérification IA en cours
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Analyse automatique de votre identité
                </p>
              </div>

              {/* Stage indicators */}
              <Card className="p-5 space-y-4 bg-card/50 backdrop-blur-sm border-primary/10">
                {AI_STAGES.map((stage, index) => {
                  const currentIndex = AI_STAGES.findIndex(s => s.id === aiStage);
                  const isActive = stage.id === aiStage;
                  const isCompleted = index < currentIndex;
                  const isPending = index > currentIndex;

                  return (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                          isCompleted && "bg-green-500/20 text-green-500",
                          isActive && "bg-primary/20 text-primary",
                          isPending && "bg-muted text-muted-foreground"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>

                        {/* Label */}
                        <span className={cn(
                          "text-sm font-medium transition-colors",
                          isCompleted && "text-green-500",
                          isActive && "text-foreground",
                          isPending && "text-muted-foreground"
                        )}>
                          {stage.label}
                        </span>

                        {/* Checkmark for completed */}
                        {isCompleted && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-green-500 text-xs"
                          >
                            ✓
                          </motion.span>
                        )}
                      </div>

                      {/* Progress bar for active stage */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="ml-11"
                        >
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                              style={{ width: `${stageProgress}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </Card>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Données chiffrées et sécurisées</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Section */}
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Conseils</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Utilisez un document en cours de validité</li>
            <li>• Assurez-vous que les textes sont lisibles</li>
            <li>• Évitez les reflets et ombres sur le document</li>
            <li>• Votre selfie doit être récent et net</li>
          </ul>
        </Card>
      </div>
    </div>
    </>
  );
};

export default VerifyIdentity;
