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
import * as faceapi from 'face-api.js';

interface SelfieCaptureProps {
  onCaptureComplete: (selfieUrl: string) => void;
  onSkip?: () => void;
  documentUrl: string;
}

type CaptureStep = 'instructions' | 'loading-models' | 'camera' | 'liveness' | 'preview' | 'uploading';

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
    instruction: 'Fermez les yeux puis rouvrez-les',
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

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

const SelfieCapture = ({ onCaptureComplete, onSkip, documentUrl }: SelfieCaptureProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  
  const [step, setStep] = useState<CaptureStep>('instructions');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Liveness detection state
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean[]>([false, false]);
  const [livenessVerified, setLivenessVerified] = useState(false);
  
  // Face detection state
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const [headAngle, setHeadAngle] = useState<number>(0);
  const [eyesOpen, setEyesOpen] = useState<boolean>(true);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const previousEyesOpenRef = useRef<boolean>(true);

  // Get random 2 challenges for this session
  const [selectedChallenges] = useState<Challenge[]>(() => {
    const shuffled = [...LIVENESS_CHALLENGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  });

  const currentChallenge = selectedChallenges[currentChallengeIndex];

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    setStep('loading-models');
    setLoadingProgress(0);
    
    try {
      // Load models sequentially with progress updates
      setLoadingProgress(10);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      setLoadingProgress(40);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      
      setLoadingProgress(70);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      
      setLoadingProgress(100);
      setModelsLoaded(true);
      
      console.log('Face-api models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading face-api models:', error);
      setCameraError('Erreur lors du chargement des modèles de détection faciale');
      setStep('instructions');
      return false;
    }
  }, []);

  // Real face detection using face-api.js
  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    
    const detectFace = async () => {
      if (!video || video.paused || video.ended) return;

      try {
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections) {
          setFaceDetected(true);
          
          // Get expressions
          const expressions = detections.expressions;
          const dominantExpression = Object.entries(expressions).reduce((a, b) => 
            a[1] > b[1] ? a : b
          )[0];
          setCurrentExpression(dominantExpression);
          
          // Calculate head angle from landmarks
          const landmarks = detections.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          
          // Calculate head rotation based on eye positions
          const leftEyeCenter = {
            x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
            y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
          };
          const rightEyeCenter = {
            x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
            y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
          };
          
          // Estimate head angle based on face box position relative to frame
          const faceBox = detections.detection.box;
          const frameCenter = video.videoWidth / 2;
          const faceCenter = faceBox.x + faceBox.width / 2;
          const angle = ((faceCenter - frameCenter) / frameCenter) * 45; // -45 to +45 degrees
          setHeadAngle(angle);
          
          // Eye aspect ratio for blink detection
          const calculateEAR = (eye: faceapi.Point[]) => {
            const vertical1 = Math.sqrt(
              Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2)
            );
            const vertical2 = Math.sqrt(
              Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2)
            );
            const horizontal = Math.sqrt(
              Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2)
            );
            return (vertical1 + vertical2) / (2.0 * horizontal);
          };
          
          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2;
          
          // Threshold for closed eyes
          const EAR_THRESHOLD = 0.22;
          const areEyesOpen = avgEAR > EAR_THRESHOLD;
          
          // Detect blink (eyes were open, now closed)
          if (previousEyesOpenRef.current && !areEyesOpen) {
            setBlinkDetected(true);
          }
          
          previousEyesOpenRef.current = areEyesOpen;
          setEyesOpen(areEyesOpen);
          
        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    // Run detection every 150ms for smooth tracking
    detectionIntervalRef.current = window.setInterval(detectFace, 150);
  }, [modelsLoaded]);

  // Stop face detection
  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    
    // Load models first if not loaded
    if (!modelsLoaded) {
      const loaded = await loadModels();
      if (!loaded) return;
    }
    
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Votre navigateur ne supporte pas l\'accès à la caméra. Essayez avec Chrome ou Safari.');
        return;
      }
      
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      console.log('Camera stream obtained:', stream.getTracks());
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata loaded');
          try {
            await videoRef.current?.play();
            console.log('Video playing');
            
            // Start face detection after video is playing
            setTimeout(() => {
              startFaceDetection();
            }, 500);
          } catch (playError) {
            console.error('Video play error:', playError);
            setCameraError('Impossible de démarrer la vidéo. Appuyez sur l\'écran et réessayez.');
          }
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          setCameraError('Erreur lors du chargement de la vidéo.');
        };
      }
      
      setStep('camera');
      
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError') {
        setCameraError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée sur votre appareil.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('La caméra est utilisée par une autre application. Fermez les autres apps et réessayez.');
      } else if (error.name === 'OverconstrainedError') {
        // Try again with less constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.onloadedmetadata = async () => {
              await videoRef.current?.play();
              setTimeout(() => startFaceDetection(), 500);
            };
          }
          setStep('camera');
          return;
        } catch {
          setCameraError('Impossible de configurer la caméra.');
        }
      } else {
        setCameraError(`Impossible d'accéder à la caméra: ${error.message || 'Erreur inconnue'}`);
      }
    }
  }, [modelsLoaded, loadModels, startFaceDetection]);

  // Stop camera
  const stopCamera = useCallback(() => {
    stopFaceDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopFaceDetection]);

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
    setBlinkDetected(false);
  }, []);

  // Check challenge completion based on real face detection
  useEffect(() => {
    if (step !== 'liveness' || livenessVerified || !currentChallenge) return;

    let completed = false;

    switch (currentChallenge.type) {
      case 'blink':
        if (blinkDetected) {
          completed = true;
          setBlinkDetected(false); // Reset for potential next blink challenge
        }
        break;
      case 'turn_left':
        // Head turned left (positive angle in mirrored view)
        if (headAngle > 15) {
          completed = true;
        }
        break;
      case 'turn_right':
        // Head turned right (negative angle in mirrored view)
        if (headAngle < -15) {
          completed = true;
        }
        break;
      case 'smile':
        if (currentExpression === 'happy') {
          completed = true;
        }
        break;
    }

    if (completed) {
      // Update progress smoothly
      const progressInterval = setInterval(() => {
        setChallengeProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            
            // Mark current challenge as completed
            const newCompleted = [...challengeCompleted];
            newCompleted[currentChallengeIndex] = true;
            setChallengeCompleted(newCompleted);
            
            if (currentChallengeIndex < selectedChallenges.length - 1) {
              // Move to next challenge
              setTimeout(() => {
                setCurrentChallengeIndex(prev => prev + 1);
                setChallengeProgress(0);
              }, 500);
            } else {
              // All challenges completed
              setTimeout(() => {
                setLivenessVerified(true);
                toast.success('Vérification de vivacité réussie!');
              }, 500);
            }
            return 100;
          }
          return prev + 10;
        });
      }, 50);
      
      return () => clearInterval(progressInterval);
    }
  }, [step, currentChallenge, blinkDetected, headAngle, currentExpression, livenessVerified, currentChallengeIndex, challengeCompleted, selectedChallenges.length]);

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
    setBlinkDetected(false);
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

  // Get challenge status indicator
  const getChallengeStatus = () => {
    if (!currentChallenge) return '';
    
    switch (currentChallenge.type) {
      case 'blink':
        return eyesOpen ? '👀 Yeux ouverts - Clignez!' : '😌 Yeux fermés';
      case 'turn_left':
        return headAngle > 5 ? `↩️ Angle: ${Math.round(headAngle)}°` : '➡️ Tournez plus à gauche';
      case 'turn_right':
        return headAngle < -5 ? `↪️ Angle: ${Math.round(Math.abs(headAngle))}°` : '⬅️ Tournez plus à droite';
      case 'smile':
        return currentExpression === 'happy' ? '😊 Sourire détecté!' : `Expression: ${currentExpression}`;
      default:
        return '';
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
                : step === 'loading-models'
                ? 'Chargement de la détection faciale...'
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
                  <span className="font-semibold">Vérification de vivacité IA</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Notre système utilise l'intelligence artificielle pour détecter 
                  les mouvements réels de votre visage et garantir que vous êtes 
                  une vraie personne.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Détection du clignement des yeux</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    <span>Suivi des mouvements de la tête</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-primary" />
                    <span>Reconnaissance des expressions</span>
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

          {/* Loading Models Step */}
          {step === 'loading-models' && (
            <motion.div
              key="loading-models"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <div className="relative mx-auto w-16 h-16">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-semibold">Chargement de l'IA...</p>
                <p className="text-sm text-muted-foreground">
                  Préparation des modèles de détection faciale
                </p>
              </div>
              <Progress value={loadingProgress} className="max-w-xs mx-auto" />
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
                          ? "✅ Visage détecté par IA - Prêt pour la vérification"
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
                      </div>
                      <Progress value={challengeProgress} className="mt-3 h-2" />
                      <p className="text-xs text-center mt-2 text-muted-foreground">
                        {getChallengeStatus()}
                      </p>
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
                    <span className="text-xs font-medium">IA Vérifié ✓</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 text-center">
                  ✅ Vérification de vivacité par IA réussie! Votre photo est prête.
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
