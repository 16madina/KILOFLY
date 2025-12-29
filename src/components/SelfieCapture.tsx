import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Check, X, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SelfieCaptureProps {
  onCaptureComplete: (selfieUrl: string) => void;
  onSkip?: () => void;
  documentUrl: string;
}

type CaptureStep = 'instructions' | 'camera' | 'preview' | 'uploading';

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
      
      // Simulate face detection after a delay (in production, use a real face detection library)
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
              Prenez un selfie pour confirmer votre identité
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
                  <span className="font-semibold">Pourquoi cette étape ?</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Nous allons comparer votre selfie avec la photo de votre document d'identité 
                  pour nous assurer que c'est bien vous. C'est une mesure de sécurité importante 
                  pour protéger tous les utilisateurs de KiloFly.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Regardez directement la caméra</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Assurez-vous d'être bien éclairé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Retirez lunettes de soleil et chapeau</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Centrez votre visage dans le cadre</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={startCamera}
                  className="flex-1 gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Ouvrir la caméra
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

          {/* Camera Step */}
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
                          ? "✅ Visage détecté - Restez immobile"
                          : "Placez votre visage dans le cercle"
                        }
                      </p>
                    </div>

                    {/* Countdown overlay */}
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
                      onClick={startCapture}
                      disabled={!faceDetected || countdown !== null}
                      className="flex-1 gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Capturer
                    </Button>
                  </div>
                </>
              )}
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
                
                {/* Success indicator */}
                <div className="absolute top-4 right-4">
                  <div className="bg-green-500 text-white rounded-full p-2">
                    <Check className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Votre photo est-elle nette et votre visage bien visible ?
              </p>

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
