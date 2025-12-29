import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Check, X, Loader2, AlertCircle, Sparkles, Eye, RotateCcw, Smile, Upload, Play } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const triedFallbackRef = useRef(false);
  
  const [step, setStep] = useState<CaptureStep>('instructions');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  
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

  // Debug mode
  const [debugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('debugCamera') === '1';
    }
    return false;
  });

  // Get random 2 challenges for this session
  const [selectedChallenges] = useState<Challenge[]>(() => {
    const shuffled = [...LIVENESS_CHALLENGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  });

  const currentChallenge = selectedChallenges[currentChallengeIndex];

  // Load face-api.js models (can run in background)
  const loadModels = useCallback(async () => {
    if (modelsLoaded) return true;
    
    setLoadingProgress(0);
    
    try {
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
      return false;
    }
  }, [modelsLoaded]);

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
          
          // Estimate head angle based on face box position relative to frame
          const faceBox = detections.detection.box;
          const frameCenter = video.videoWidth / 2;
          const faceCenter = faceBox.x + faceBox.width / 2;
          const angle = ((faceCenter - frameCenter) / frameCenter) * 45;
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
          
          const EAR_THRESHOLD = 0.22;
          const areEyesOpen = avgEAR > EAR_THRESHOLD;
          
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

    detectionIntervalRef.current = window.setInterval(detectFace, 150);
  }, [modelsLoaded]);

  // Stop face detection
  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Attempt to play video with iOS workaround
  const tryPlayVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;
    
    try {
      await video.play();
      setVideoReady(true);
      setNeedsManualPlay(false);
      return true;
    } catch (playError) {
      console.warn('Auto-play blocked, user gesture needed:', playError);
      setNeedsManualPlay(true);
      return false;
    }
  }, []);

  // Manual play handler for iOS
  const handleManualPlay = useCallback(async () => {
    const success = await tryPlayVideo();
    if (success && modelsLoaded) {
      stopFaceDetection();
      setTimeout(() => startFaceDetection(), 200);
    }
  }, [tryPlayVideo, modelsLoaded, stopFaceDetection, startFaceDetection]);

  // Attach stream to video element
  const attachStreamToVideo = useCallback(async () => {
    const stream = streamRef.current;
    const video = videoRef.current;

    if (!stream || !video) return;

    // iOS Safari requirements
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', 'true');

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    // Wait for metadata
    if (video.readyState < 1) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => resolve();
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
      });
    }

    // Try to play
    const played = await tryPlayVideo();
    
    if (played && modelsLoaded) {
      stopFaceDetection();
      setTimeout(() => startFaceDetection(), 200);
    }
  }, [tryPlayVideo, modelsLoaded, startFaceDetection, stopFaceDetection]);

  // Start camera - now starts immediately, models load in background
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setVideoReady(false);
    setNeedsManualPlay(false);
    triedFallbackRef.current = false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Votre navigateur ne supporte pas l'accès à la caméra. Essayez avec Chrome ou Safari.");
        return;
      }

      const isMobile =
        typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

      // Start camera immediately (desktop: be permissive to avoid black frames)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isMobile
          ? {
              facingMode: { ideal: "user" },
              width: { ideal: 720 },
              height: { ideal: 720 },
            }
          : true,
        audio: false,
      });

      streamRef.current = stream;
      setStep('camera');

      // Attach stream immediately
      setTimeout(() => {
        attachStreamToVideo();
      }, 50);

      // If we get a stream but the video stays black (0x0), retry with very loose constraints.
      setTimeout(async () => {
        const video = videoRef.current;
        const track = streamRef.current?.getVideoTracks?.()[0];

        if (!video || !track) return;
        if (triedFallbackRef.current) return;

        const hasFrames = video.videoWidth > 0 && video.videoHeight > 0;
        if (hasFrames) return;

        triedFallbackRef.current = true;
        console.warn('[SelfieCapture] Video has no frames yet, retrying with fallback constraints');

        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          // Stop previous tracks and swap streams
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = fallbackStream;

          await attachStreamToVideo();
        } catch (e) {
          console.error('[SelfieCapture] Fallback camera attempt failed:', e);
        }
      }, 1500);

      // Load models in background if not loaded
      if (!modelsLoaded) {
        loadModels().then((loaded) => {
          if (loaded && videoRef.current && !videoRef.current.paused) {
            startFaceDetection();
          }
        });
      }

    } catch (error: any) {
      console.error('Camera error:', error);
      if (error?.name === 'NotAllowedError') {
        setCameraError("Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
      } else if (error?.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée sur votre appareil.');
      } else if (error?.name === 'NotReadableError') {
        setCameraError('La caméra est utilisée par une autre application. Fermez les autres apps et réessayez.');
      } else if (error?.name === 'OverconstrainedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = fallbackStream;
          setStep('camera');
          setTimeout(() => attachStreamToVideo(), 50);
          
          if (!modelsLoaded) {
            loadModels();
          }
        } catch {
          setCameraError('Impossible de configurer la caméra.');
        }
      } else {
        setCameraError(`Impossible d'accéder à la caméra: ${error?.message || 'Erreur inconnue'}`);
      }
    }
  }, [modelsLoaded, loadModels, attachStreamToVideo, startFaceDetection]);

  // Stop camera
  const stopCamera = useCallback(() => {
    stopFaceDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
    setNeedsManualPlay(false);
  }, [stopFaceDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Re-attach stream when step changes to camera/liveness
  useEffect(() => {
    if ((step === 'camera' || step === 'liveness') && streamRef.current) {
      attachStreamToVideo();
    }
  }, [step, attachStreamToVideo]);

  // Start face detection when models are loaded and video is playing
  useEffect(() => {
    if (modelsLoaded && videoReady && (step === 'camera' || step === 'liveness')) {
      stopFaceDetection();
      startFaceDetection();
    }
  }, [modelsLoaded, videoReady, step, startFaceDetection, stopFaceDetection]);

  // Start liveness detection
  const startLivenessDetection = useCallback(() => {
    setStep('liveness');
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    setChallengeCompleted([false, false]);
    setLivenessVerified(false);
    setBlinkDetected(false);
  }, []);

  // Handle file upload fallback
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setCapturedImage(imageUrl);
      setStep('preview');
      setLivenessVerified(true); // Skip liveness for fallback
    };
    reader.readAsDataURL(file);
  }, []);

  // Check challenge completion based on real face detection
  useEffect(() => {
    if (step !== 'liveness' || livenessVerified || !currentChallenge) return;

    let completed = false;

    switch (currentChallenge.type) {
      case 'blink':
        if (blinkDetected) {
          completed = true;
          setBlinkDetected(false);
        }
        break;
      case 'turn_left':
        if (headAngle > 15) {
          completed = true;
        }
        break;
      case 'turn_right':
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
      const progressInterval = setInterval(() => {
        setChallengeProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            
            const newCompleted = [...challengeCompleted];
            newCompleted[currentChallengeIndex] = true;
            setChallengeCompleted(newCompleted);
            
            if (currentChallengeIndex < selectedChallenges.length - 1) {
              setTimeout(() => {
                setCurrentChallengeIndex(prev => prev + 1);
                setChallengeProgress(0);
              }, 500);
            } else {
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
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror the image for a natural selfie look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    
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
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const fileName = `${user.id}/selfie-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
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

  // Debug info component
  const DebugInfo = () => {
    if (!debugMode) return null;
    
    const video = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    
    return (
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono">
        <div>readyState: {video?.readyState ?? 'N/A'}</div>
        <div>videoW: {video?.videoWidth ?? 0} x {video?.videoHeight ?? 0}</div>
        <div>paused: {video?.paused ? 'true' : 'false'}</div>
        <div>track: {track?.readyState ?? 'none'}</div>
        <div>models: {modelsLoaded ? '✓' : '...'}</div>
        <div>face: {faceDetected ? '✓' : '✗'}</div>
        <Button 
          size="sm" 
          variant="secondary"
          className="mt-2 text-xs h-6"
          onClick={() => {
            stopCamera();
            startCamera();
          }}
        >
          Restart
        </Button>
      </div>
    );
  };

  // Video container component - iOS Safari safe (no overflow-hidden, no transform)
  const VideoContainer = ({ children }: { children: React.ReactNode }) => (
    <div 
      className="relative aspect-square bg-black rounded-2xl"
      style={{
        // iOS Safari safe - avoid any transform on video parent
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>
  );

  return (
    <Card className="p-6">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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

              {/* Fallback option */}
              <div className="text-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  <Upload className="h-3 w-3 inline mr-1" />
                  Ou importer un selfie
                </button>
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

          {/* Camera + Liveness (shared video element to avoid black screen on step switch) */}
          {(step === 'camera' || step === 'liveness') && (
            <motion.div
              key="camera-liveness"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {step === 'camera' && cameraError ? (
                <div className="p-6 bg-destructive/10 rounded-xl text-center space-y-3">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                  <p className="text-destructive">{cameraError}</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={startCamera}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Réessayer
                    </Button>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <VideoContainer>
                    <DebugInfo />

                    {/* Shared video element (must stay mounted across steps) */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded-2xl"
                      style={{
                        minWidth: '100%',
                        minHeight: '100%'
                      }}
                    />

                    {/* Tap to play overlay (only when needed) */}
                    {needsManualPlay && step === 'camera' && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl cursor-pointer z-10"
                        onClick={handleManualPlay}
                      >
                        <div className="text-center text-white">
                          <Play className="h-16 w-16 mx-auto mb-2" />
                          <p className="text-sm">Touchez pour activer la caméra</p>
                        </div>
                      </div>
                    )}

                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl">
                      <div
                        className={cn(
                          "w-56 h-72 rounded-[50%] border-4 transition-all duration-300",
                          step === 'liveness'
                            ? livenessVerified
                              ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                              : "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            : faceDetected
                              ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                              : "border-white/50"
                        )}
                      />
                    </div>

                    {/* Loading models indicator */}
                    {!modelsLoaded && videoReady && step === 'camera' && (
                      <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-gray-900/90 rounded-lg p-3 flex items-center gap-2 pointer-events-none">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm">Chargement IA... {loadingProgress}%</span>
                      </div>
                    )}

                    {/* Camera step instructions */}
                    {step === 'camera' && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl pointer-events-none">
                        <p className="text-white text-center text-sm">
                          {!videoReady
                            ? "Démarrage de la caméra..."
                            : !modelsLoaded
                              ? "Chargement de la détection IA..."
                              : faceDetected
                                ? "✅ Visage détecté - Prêt pour la vérification"
                                : "Placez votre visage dans le cercle"
                          }
                        </p>
                      </div>
                    )}

                    {/* Liveness overlays */}
                    {step === 'liveness' && (
                      <>
                        {/* Challenge instruction overlay */}
                        {!livenessVerified && currentChallenge && (
                          <div
                            key={currentChallengeIndex}
                            className="absolute top-4 left-4 right-4 pointer-events-none"
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
                          </div>
                        )}

                        {/* Success overlay */}
                        {livenessVerified && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl pointer-events-none">
                            <div className="bg-green-500 text-white rounded-full p-6">
                              <Check className="h-12 w-12" />
                            </div>
                          </div>
                        )}

                        {/* Countdown overlay */}
                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl pointer-events-none">
                            <span className="text-8xl font-bold text-white">{countdown}</span>
                          </div>
                        )}

                        {/* Bottom progress indicators */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl pointer-events-none">
                          <div className="flex items-center justify-center gap-2">
                            {selectedChallenges.map((_, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "w-3 h-3 rounded-full transition-colors",
                                  challengeCompleted[index]
                                    ? 'bg-green-500'
                                    : index === currentChallengeIndex
                                      ? 'bg-blue-500'
                                      : 'bg-white/50'
                                )}
                              />
                            ))}
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full transition-colors",
                                livenessVerified ? 'bg-green-500' : 'bg-white/50'
                              )}
                            />
                          </div>
                          <p className="text-white text-center text-sm mt-2">
                            {livenessVerified
                              ? "✅ Vivacité confirmée - Photo dans 3s..."
                              : `Défi ${currentChallengeIndex + 1}/${selectedChallenges.length}`
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </VideoContainer>

                  {step === 'camera' ? (
                    <>
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
                          disabled={!faceDetected || !modelsLoaded}
                          className="flex-1 gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Continuer
                        </Button>
                      </div>

                      {/* Fallback link */}
                      <div className="text-center">
                        <button
                          onClick={() => {
                            stopCamera();
                            fileInputRef.current?.click();
                          }}
                          className="text-sm text-muted-foreground hover:text-primary underline"
                        >
                          Problème de caméra? Importer un selfie
                        </button>
                      </div>
                    </>
                  ) : (
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
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 'preview' && capturedImage && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative aspect-square bg-black rounded-2xl">
                <img
                  src={capturedImage}
                  alt="Selfie capturé"
                  className="w-full h-full object-cover rounded-2xl"
                />
                
                {/* Success indicators */}
                <div className="absolute top-4 right-4 space-y-2">
                  <div className="bg-green-500 text-white rounded-full p-2 flex items-center gap-1 px-3">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {livenessVerified ? 'IA Vérifié ✓' : 'Photo importée'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 text-center">
                  {livenessVerified 
                    ? '✅ Vérification de vivacité par IA réussie! Votre photo est prête.'
                    : '✅ Photo prête pour la vérification.'
                  }
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
                  Votre photo de profil est en cours d'envoi
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default SelfieCapture;
