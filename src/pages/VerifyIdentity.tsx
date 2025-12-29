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

const VerifyIdentity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('document');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

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

  const handleDocumentUploaded = (url: string) => {
    setDocumentUrl(url);
    setCurrentStep('selfie');
    toast.success('Document enregistré! Passons à la vérification faciale.');
  };

  const handleSelfieComplete = async (selfieUrl: string) => {
    setCurrentStep('verifying');
    
    try {
      toast.info('🤖 Vérification en cours avec comparaison faciale...');
      
      const { data, error } = await supabase.functions.invoke('verify-id-document', {
        body: {
          userId: user?.id,
          documentUrl: documentUrl,
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

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    navigate('/profile');
  };

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

  // Show completed state
  if (currentStep === 'complete' && status) {
    return (
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
    );
  }

  return (
    <>
      {/* Success Popup */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-md text-center">
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
            
            <Button 
              onClick={handleCloseSuccessPopup}
              className="w-full mt-4 gap-2"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              Continuer
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>

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
              className="py-16 text-center space-y-6"
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold">Vérification en cours</p>
                <p className="text-muted-foreground mt-2">
                  Notre IA analyse votre document et compare votre visage...
                </p>
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
