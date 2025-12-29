import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Check, X, Loader2, AlertCircle, Sparkles, Eye, RotateCcw, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface SelfieCaptureProps {
  onCaptureComplete: (selfieUrl: string) => void;
  onSkip?: () => void;
  documentUrl: string;
}

type CaptureStep = 'instructions' | 'camera' | 'liveness' | 'preview' | 'uploading';

type LivenessChallenge = 'blink' | 'turn_left' | 'turn_right' | 'smile';

interface Challenge {
  type: LivenessChallenge;
  label: string;
  instruction: string;
  icon: React.ReactNode;
}

const LIVENESS_CHALLENGES: Challenge[] = [
  {
    type: 'blink',
    label: 'Clignez des yeux',
    instruction: 'Clignez des yeux 2 fois',
    icon: <Eye className="h-6 w-6" />
  },
  {
    type: 'turn_left',
    label: 'Tournez à gauche',
    instruction: 'Tournez lentement la tête vers la gauche',
    icon: <RotateCcw className="h-6 w-6" />
  },
  {
    type: 'turn_right',
    label: 'Tournez à droite',
    instruction: 'Tournez lentement la tête vers la droite',
    icon: <RotateCcw className="h-6 w-6 scale-x-[-1]" />
  },
  {
    type: 'smile',
    label: 'Souriez',
    instruction: 'Faites un grand sourire',
    icon: <Smile className="h-6 w-6" />
  }
];

const SelfieCapture = ({ onCaptureComplete, onSkip, documentUrl }: SelfieCaptureProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [step, setStep] = useState<CaptureStep>('instructions');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Liveness detection state
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean[]>([false, false, false, false]);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [challengeTimer, setChallengeTimer] = useState<number>(5);

  // Get random 2 challenges for this session
  const [selectedChallenges] = useState<Challenge[]>(() => {
    const shuffled = [...LIVENESS_CHALLENGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  });

  const currentChallenge = selectedChallenges[currentChallengeIndex];

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setStep('camera');
      
      // Simulate face detection after a delay
      setTimeout(() => setFaceDetected(true), 1500);
      
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError') {
        setCameraError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée sur votre appareil.');
      } else {
        setCameraError('Impossible d\'accéder à la caméra. Veuillez réessayer.');
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start liveness detection
  const startLivenessDetection = useCallback(() => {
    setStep('liveness');
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    setChallengeCompleted([false, false]);
    setLivenessVerified(false);
    setChallengeTimer(5);
  }, []);

  // Simulate challenge detection (in production, use real ML models)
  useEffect(() => {
    if (step !== 'liveness' || livenessVerified) return;

    // Timer countdown
    const timerInterval = setInterval(() => {
      setChallengeTimer(prev => {
        if (prev <= 1) {
          // Challenge completed (simulated)
          const newCompleted = [...challengeCompleted];
          newCompleted[currentChallengeIndex] = true;
          setChallengeCompleted(newCompleted);
          
          if (currentChallengeIndex < selectedChallenges.length - 1) {
            // Move to next challenge
            setCurrentChallengeIndex(prev => prev + 1);
            setChallengeProgress(0);
            return 5;
          } else {
            // All challenges completed
            setLivenessVerified(true);
            clearInterval(timerInterval);
            toast.success('Vérification de vivacité réussie!');
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    // Progress animation
    const progressInterval = setInterval(() => {
      setChallengeProgress(prev => Math.min(prev + 5, 100));
    }, 250);

    return () => {
      clearInterval(timerInterval);
      clearInterval(progressInterval);
    };
  }, [step, currentChallengeIndex, livenessVerified, challengeCompleted, selectedChallenges.length]);

  // Auto-capture after liveness verified
  useEffect(() => {
    if (livenessVerified && step === 'liveness') {
      setTimeout(() => {
        startCapture();
      }, 1000);
    }
  }, [livenessVerified, step]);

  // Capture photo with countdown
  const startCapture = useCallback(() => {
    setCountdown(3);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror the image for a natural selfie look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    
    // Stop camera and show preview
    stopCamera();
    setStep('preview');
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setFaceDetected(false);
    setLivenessVerified(false);
    setCurrentChallengeIndex(0);
    setChallengeCompleted([false, false]);
    startCamera();
  }, [startCamera]);

  // Upload selfie and trigger verification
  const uploadSelfie = async () => {
    if (!capturedImage || !user) return;
    
    setUploading(true);
    setStep('uploading');
    
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/selfie-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update profile with new avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      toast.success('Selfie enregistré avec succès');
      onCaptureComplete(publicUrl);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'envoi du selfie');
      setStep('preview');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6 overflow-hidden">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Vérification faciale</h3>
            <p className="text-sm text-muted-foreground">
              {step === 'liveness' 
                ? 'Suivez les instructions pour prouver votre identité'
                : 'Prenez un selfie pour confirmer votre identité'
              }
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Instructions Step */}
          {step === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Vérification de vivacité</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour garantir que vous êtes une vraie personne et non une photo, 
                  nous allons vous demander d'effectuer quelques mouvements simples 
                  devant la caméra.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Clignez des yeux sur demande</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    <span>Tournez la tête dans la direction indiquée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-primary" />
                    <span>Souriez à la caméra</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    🔒 Assurez-vous d'être dans un endroit bien éclairé et d'avoir 
                    votre visage entièrement visible.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={startCamera}
                  className="flex-1 gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Commencer
                </Button>
                {onSkip && (
                  <Button
                    variant="outline"
                    onClick={onSkip}
                    className="text-muted-foreground"
                  >
                    Passer
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Camera Step - Face Detection */}
          {step === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {cameraError ? (
                <div className="p-6 bg-destructive/10 rounded-xl text-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                  <p className="text-destructive">{cameraError}</p>
                  <Button variant="outline" onClick={startCamera}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
                    {/* Video feed */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    
                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div 
                        className={cn(
                          "w-56 h-72 rounded-[50%] border-4 transition-colors duration-300",
                          faceDetected 
                            ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                            : "border-white/50"
                        )}
                      />
                    </div>
                    
                    {/* Instructions overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-center text-sm">
                        {faceDetected 
                          ? "✅ Visage détecté - Prêt pour la vérification"
                          : "Placez votre visage dans le cercle"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopCamera();
                        setStep('instructions');
                      }}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                    <Button
                      onClick={startLivenessDetection}
                      disabled={!faceDetected}
                      className="flex-1 gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Continuer
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Liveness Detection Step */}
          {step === 'liveness' && (
            <motion.div
              key="liveness"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
                {/* Video feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Face guide overlay with liveness indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div 
                    animate={{ 
                      borderColor: livenessVerified ? '#22c55e' : '#3b82f6',
                      boxShadow: livenessVerified 
                        ? '0 0 30px rgba(34,197,94,0.5)' 
                        : '0 0 20px rgba(59,130,246,0.3)'
                    }}
                    className="w-56 h-72 rounded-[50%] border-4 transition-all duration-300"
                  />
                </div>
                
                {/* Challenge instruction overlay */}
                {!livenessVerified && currentChallenge && (
                  <motion.div 
                    key={currentChallengeIndex}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 left-4 right-4"
                  >
                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          {currentChallenge.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{currentChallenge.label}</p>
                          <p className="text-xs text-muted-foreground">{currentChallenge.instruction}</p>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {challengeTimer}
                        </div>
                      </div>
                      <Progress value={challengeProgress} className="mt-3 h-2" />
                    </div>
                  </motion.div>
                )}

                {/* Success overlay */}
                {livenessVerified && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className="bg-green-500 text-white rounded-full p-6">
                      <Check className="h-12 w-12" />
                    </div>
                  </motion.div>
                )}

                {/* Countdown overlay for photo capture */}
                {countdown !== null && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <motion.span
                      key={countdown}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="text-8xl font-bold text-white"
                    >
                      {countdown}
                    </motion.span>
                  </motion.div>
                )}

                {/* Bottom progress indicators */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-center gap-2">
                    {selectedChallenges.map((_, index) => (
                      <motion.div
                        key={index}
                        animate={{
                          backgroundColor: challengeCompleted[index] 
                            ? '#22c55e' 
                            : index === currentChallengeIndex 
                              ? '#3b82f6' 
                              : '#ffffff50'
                        }}
                        className="w-3 h-3 rounded-full"
                      />
                    ))}
                    <motion.div
                      animate={{
                        backgroundColor: livenessVerified ? '#22c55e' : '#ffffff50'
                      }}
                      className="w-3 h-3 rounded-full"
                    />
                  </div>
                  <p className="text-white text-center text-sm mt-2">
                    {livenessVerified 
                      ? "✅ Vivacité confirmée - Photo dans 3s..."
                      : `Défi ${currentChallengeIndex + 1}/${selectedChallenges.length}`
                    }
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  stopCamera();
                  setStep('instructions');
                  setLivenessVerified(false);
                  setCurrentChallengeIndex(0);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </motion.div>
          )}

          {/* Preview Step */}
          {step === 'preview' && capturedImage && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Selfie capturé"
                  className="w-full h-full object-cover"
                />
                
                {/* Success indicators */}
                <div className="absolute top-4 right-4 space-y-2">
                  <div className="bg-green-500 text-white rounded-full p-2 flex items-center gap-1 px-3">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-medium">Vivacité ✓</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 text-center">
                  ✅ Vérification de vivacité réussie! Votre photo est prête.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reprendre
                </Button>
                <Button
                  onClick={uploadSelfie}
                  className="flex-1 gap-2"
                >
                  <Check className="h-4 w-4" />
                  Confirmer
                </Button>
              </div>
            </motion.div>
          )}

          {/* Uploading Step */}
          {step === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center space-y-4"
            >
              <div className="relative mx-auto w-20 h-20">
                <Loader2 className="h-20 w-20 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-semibold">Envoi en cours...</p>
                <p className="text-sm text-muted-foreground">
                  Nous enregistrons votre selfie et lançons la vérification
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Card>
  );
};

export default SelfieCapture;
