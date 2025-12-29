import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RefreshCw, Check, X, Loader2, AlertCircle, Sparkles, Eye, RotateCcw, Smile, Upload, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import * as faceapi from 'face-api.js';

interface SelfieCaptureProps {
  onCaptureComplete: (selfieUrl: string) => void;
  onSkip?: () => void;
  documentUrl: string;
}

type CaptureStep = 'instructions' | 'loading-models' | 'camera' | 'calibration' | 'liveness' | 'preview' | 'uploading';

type CalibrationStep = 'left' | 'right' | 'done';

type LivenessChallenge = 'nod' | 'turn_left' | 'turn_right' | 'smile';

interface Challenge {
  type: LivenessChallenge;
  label: string;
  instruction: string;
  icon: React.ReactNode;
}

const LIVENESS_CHALLENGES: Challenge[] = [
  {
    type: 'nod',
    label: 'Hochez la tête',
    instruction: 'Faites oui de la tête (haut et bas)',
    icon: <Check className="h-6 w-6" />
  },
  {
    type: 'turn_left',
    label: 'Tournez à gauche',
    instruction: 'Tournez légèrement la tête vers la gauche',
    icon: <RotateCcw className="h-6 w-6" />
  },
  {
    type: 'turn_right',
    label: 'Tournez à droite',
    instruction: 'Tournez légèrement la tête vers la droite',
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
  const watchdogIntervalRef = useRef<number | null>(null);
  const frameCheckCountRef = useRef(0);
  const restartCountRef = useRef(0);
  const faceDetectedCountRef = useRef(0); // Counter for auto-proceed
  
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
  const [autoProgressCount, setAutoProgressCount] = useState(0); // Visual countdown
  const [livenessCountdown, setLivenessCountdown] = useState<number | null>(null); // 3-2-1 countdown before challenges
  
  // Calibration state
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('left');
  const [calibrationLeftAngle, setCalibrationLeftAngle] = useState<number | null>(null);
  const [calibrationRightAngle, setCalibrationRightAngle] = useState<number | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationJustCompleted, setCalibrationJustCompleted] = useState<CalibrationStep | null>(null);
  const calibrationHoldCountRef = useRef(0);
  const calibrationTransitioningRef = useRef(false);
  
  // Liveness detection state
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean[]>([false]);
  const [livenessVerified, setLivenessVerified] = useState(false);

  // Face detection state
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const [headAngle, setHeadAngle] = useState<number>(0);
  const [headPitch, setHeadPitch] = useState<number>(0); // Déviation verticale (nod)

  // Nod (haut/bas) : 2 validations simples puis fin
  const [nodUpValidated, setNodUpValidated] = useState(false);
  const [nodDownValidated, setNodDownValidated] = useState(false);
  const [nodDetected, setNodDetected] = useState(false); // true quand UP + DOWN validés

  const baselinePitchRef = useRef<number | null>(null);
  const lastNodEventAtRef = useRef<number>(0);

  // Head-turn thresholds - VERY EASY (minimal movement required)
  // Fixed very low threshold - just 2 degrees of movement needed!
  const TURN_THRESHOLD_DEG = 2;
  const leftThreshold = -TURN_THRESHOLD_DEG;  // Just -2° for left
  const rightThreshold = TURN_THRESHOLD_DEG;  // Just +2° for right

  // Debug mode
  const [debugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('debugCamera') === '1';
    }
    return false;
  });

  // Debug stats
  const [debugStats, setDebugStats] = useState({
    framesOk: 0,
    framesLost: 0,
    restarts: 0,
    lastEvent: ''
  });

  // Only use the nod challenge - simple and easy!
  const [selectedChallenges] = useState<Challenge[]>(() => {
    return [LIVENESS_CHALLENGES.find(c => c.type === 'nod')!];
  });

  const currentChallenge = selectedChallenges[currentChallengeIndex];

  // Log debug event
  const logDebug = useCallback((event: string) => {
    console.log(`[SelfieCapture] ${event}`);
    if (debugMode) {
      setDebugStats(prev => ({ ...prev, lastEvent: event }));
    }
  }, [debugMode]);

  // Wait for actual video frames (not just play())
  const waitForVideoFrames = useCallback((timeoutMs: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve(false);
        return;
      }

      const startTime = Date.now();
      
      const checkFrames = () => {
        const hasFrames = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
        
        if (hasFrames) {
          logDebug(`Frames ready: ${video.videoWidth}x${video.videoHeight}`);
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          logDebug(`Frame timeout after ${timeoutMs}ms`);
          resolve(false);
          return;
        }
        
        requestAnimationFrame(checkFrames);
      };
      
      // Listen for events that indicate frames are ready
      const onCanPlay = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          logDebug('canplay event with valid dimensions');
          resolve(true);
        }
      };
      
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('loadeddata', onCanPlay, { once: true });
      
      checkFrames();
    });
  }, [logDebug]);

  // Load face-api.js models (skip expression model for better perf)
  const loadModels = useCallback(async () => {
    if (modelsLoaded) return true;
    
    setLoadingProgress(0);
    
    try {
      logDebug('Loading face-api models...');
      setLoadingProgress(10);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      setLoadingProgress(50);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      
      setLoadingProgress(100);
      setModelsLoaded(true);
      
      logDebug('Face-api models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading face-api models:', error);
      return false;
    }
  }, [modelsLoaded, logDebug]);

  // Real face detection using face-api.js (optimized: slower interval, smaller input)
  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    
    const detectFace = async () => {
      if (!video || video.paused || video.ended || video.videoWidth === 0) return;

      try {
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 224, // Back to 224 for better accuracy
            scoreThreshold: 0.4 // Lower threshold for better detection
          }))
          .withFaceLandmarks();

        if (detections) {
          setFaceDetected(true);
          
          // Calculate head angle from landmarks using nose and eyes
          const landmarks = detections.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          
          // Get center points
          const leftEyeCenter = {
            x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
            y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
          };
          const rightEyeCenter = {
            x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
            y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
          };
          const noseTip = nose[nose.length - 1]; // Tip of nose
          
          // Calculate eye midpoint
          const eyeMidpoint = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2
          };
          
          // Calculate distances from nose to each eye
          const noseToLeftEye = Math.sqrt(
            Math.pow(noseTip.x - leftEyeCenter.x, 2) + Math.pow(noseTip.y - leftEyeCenter.y, 2)
          );
          const noseToRightEye = Math.sqrt(
            Math.pow(noseTip.x - rightEyeCenter.x, 2) + Math.pow(noseTip.y - rightEyeCenter.y, 2)
          );
          
          // Eye distance for normalization
          const eyeDistance = Math.sqrt(
            Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) + Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
          );
          
          // Ratio-based angle estimation (robust + normalized)
          // ratio = 1 => centered (0)
          // ratio > 1 => nose closer to rightEyeCenter => positive angle
          // ratio < 1 => nose closer to leftEyeCenter  => negative angle
          // (Left/right challenge mapping is handled later, based on observed behavior.)
          const ratio = noseToLeftEye / noseToRightEye;
          
          // Convert ratio to approximate angle
          const angle = (ratio - 1) * 50; // Scale factor for sensitivity
          
          // Clamp to reasonable range
          const clampedAngle = Math.max(-45, Math.min(45, angle));
          setHeadAngle(clampedAngle);
          
          // Log angle during liveness for debugging
          if (step === 'liveness') {
            console.log(`[Liveness] Head angle: ${clampedAngle.toFixed(1)}° (ratio: ${ratio.toFixed(2)})`);
          }
          
          // Head pitch estimation for nod detection (up/down)
          // Use nose position relative to eyes to detect vertical movement
          const eyesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
          const noseToEyesVertical = noseTip.y - eyesCenterY;
          
          // Set baseline on first detection
          if (baselinePitchRef.current === null) {
            baselinePitchRef.current = noseToEyesVertical;
          }
          
          // Calculate pitch deviation from baseline
          const pitchDeviation = noseToEyesVertical - baselinePitchRef.current;
          setHeadPitch(pitchDeviation);
          
          // Log pitch during liveness for debugging
          if (step === 'liveness') {
            console.log(`[Liveness] Head pitch: ${pitchDeviation.toFixed(1)} | UP: ${nodUpValidated} | DOWN: ${nodDownValidated}`);
          }
          
          // Simplified nod detection: validate UP once, DOWN once, then done
          // Very easy threshold - just 5 pixels of movement
          const NOD_THRESHOLD = 5;
          const now = Date.now();
          
          // Debounce: only register new events after 300ms
          if (now - lastNodEventAtRef.current > 300) {
            // Detect UP movement (head tilted back = negative pitch)
            if (pitchDeviation < -NOD_THRESHOLD && !nodUpValidated) {
              setNodUpValidated(true);
              lastNodEventAtRef.current = now;
              console.log('[Liveness] ✅ UP validated!');
            }
            
            // Detect DOWN movement (head tilted forward = positive pitch)
            if (pitchDeviation > NOD_THRESHOLD && !nodDownValidated) {
              setNodDownValidated(true);
              lastNodEventAtRef.current = now;
              console.log('[Liveness] ✅ DOWN validated!');
            }
          }
          
          if (debugMode) {
            setDebugStats(prev => ({ ...prev, framesOk: prev.framesOk + 1 }));
          }
        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    // Slower interval for better performance (300ms instead of 150ms)
    detectionIntervalRef.current = window.setInterval(detectFace, 300);
  }, [modelsLoaded, debugMode]);

  // Stop face detection
  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Stop watchdog
  const stopWatchdog = useCallback(() => {
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  // Start watchdog to detect frame drops and auto-restart
  const startWatchdog = useCallback(() => {
    stopWatchdog();
    
    watchdogIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const track = streamRef.current?.getVideoTracks()[0];
      
      if (!video || !track) return;
      
      const hasFrames = video.videoWidth > 0 && video.videoHeight > 0;
      const trackAlive = track.readyState === 'live' && !track.muted;
      
      if (!hasFrames || !trackAlive) {
        frameCheckCountRef.current++;
        
        if (debugMode) {
          setDebugStats(prev => ({ ...prev, framesLost: prev.framesLost + 1 }));
        }
        
        // After 3 consecutive failures, try to restart
        if (frameCheckCountRef.current >= 3 && restartCountRef.current < 3) {
          logDebug(`Watchdog: frames lost (${frameCheckCountRef.current}), restarting camera...`);
          restartCountRef.current++;
          frameCheckCountRef.current = 0;
          
          if (debugMode) {
            setDebugStats(prev => ({ ...prev, restarts: prev.restarts + 1 }));
          }
          
          // Try to restart camera
          restartCamera();
        }
      } else {
        frameCheckCountRef.current = 0;
      }
    }, 1000);
  }, [stopWatchdog, debugMode, logDebug]);

  // Restart camera without full reset
  const restartCamera = useCallback(async () => {
    logDebug('Restarting camera...');
    
    const video = videoRef.current;
    if (!video) return;
    
    try {
      // Stop current stream
      streamRef.current?.getTracks().forEach(t => t.stop());
      
      // Get new stream with loose constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      
      streamRef.current = stream;
      video.srcObject = stream;
      
      await video.play();
      
      const hasFrames = await waitForVideoFrames(3000);
      if (hasFrames) {
        setVideoReady(true);
        setNeedsManualPlay(false);
        logDebug('Camera restarted successfully');
      }
    } catch (error) {
      logDebug(`Restart failed: ${error}`);
    }
  }, [waitForVideoFrames, logDebug]);

  // Attempt to play video with iOS workaround
  const tryPlayVideo = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;
    
    try {
      await video.play();
      
      // Wait for actual frames before marking as ready
      const hasFrames = await waitForVideoFrames(4000);
      
      if (hasFrames) {
        setVideoReady(true);
        setNeedsManualPlay(false);
        return true;
      } else {
        logDebug('Video playing but no frames');
        return false;
      }
    } catch (playError) {
      console.warn('Auto-play blocked, user gesture needed:', playError);
      setNeedsManualPlay(true);
      return false;
    }
  }, [waitForVideoFrames, logDebug]);

  // Manual play handler for iOS
  const handleManualPlay = useCallback(async () => {
    logDebug('Manual play triggered');
    const success = await tryPlayVideo();
    if (success && modelsLoaded) {
      stopFaceDetection();
      setTimeout(() => startFaceDetection(), 200);
    }
  }, [tryPlayVideo, modelsLoaded, stopFaceDetection, startFaceDetection, logDebug]);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setVideoReady(false);
    setNeedsManualPlay(false);
    frameCheckCountRef.current = 0;
    restartCountRef.current = 0;

    logDebug('Starting camera...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Votre navigateur ne supporte pas l'accès à la caméra. Essayez avec Chrome ou Safari.");
        return;
      }

      const isMobile =
        typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

      // Get camera stream
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

      // Wait a tick for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const video = videoRef.current;
      if (!video) {
        logDebug('Video element not found');
        return;
      }

      // iOS Safari requirements
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.srcObject = stream;

      // Track end listener
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          logDebug('Track ended');
          if (step === 'camera' || step === 'liveness') {
            restartCamera();
          }
        };
        track.onmute = () => {
          logDebug('Track muted');
        };
      }

      // Try to play
      const played = await tryPlayVideo();
      
      if (!played) {
        // Retry with fallback constraints
        logDebug('First attempt failed, trying fallback...');
        try {
          streamRef.current?.getTracks().forEach(t => t.stop());
          
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          
          streamRef.current = fallbackStream;
          video.srcObject = fallbackStream;
          
          await tryPlayVideo();
        } catch (e) {
          logDebug(`Fallback failed: ${e}`);
        }
      }

      // Start watchdog
      startWatchdog();

      // Load models in background if not loaded
      if (!modelsLoaded) {
        loadModels().then((loaded) => {
          if (loaded && videoRef.current && videoReady) {
            startFaceDetection();
          }
        });
      } else if (videoReady) {
        startFaceDetection();
      }

    } catch (error: any) {
      console.error('Camera error:', error);
      logDebug(`Camera error: ${error?.name || error}`);
      
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
          
          setTimeout(async () => {
            const video = videoRef.current;
            if (video) {
              video.srcObject = fallbackStream;
              await tryPlayVideo();
              startWatchdog();
            }
          }, 100);
          
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
  }, [modelsLoaded, loadModels, tryPlayVideo, startFaceDetection, startWatchdog, logDebug, step, videoReady, restartCamera]);

  // Stop camera
  const stopCamera = useCallback(() => {
    logDebug('Stopping camera');
    stopFaceDetection();
    stopWatchdog();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
    setNeedsManualPlay(false);
  }, [stopFaceDetection, stopWatchdog, logDebug]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start face detection when models are loaded and video is playing
  useEffect(() => {
    if (modelsLoaded && videoReady && (step === 'camera' || step === 'liveness')) {
      stopFaceDetection();
      startFaceDetection();
    }
  }, [modelsLoaded, videoReady, step, startFaceDetection, stopFaceDetection]);

  // Auto-proceed to liveness when face detected for 2 seconds
  useEffect(() => {
    if (step !== 'camera' || !faceDetected || !modelsLoaded || !videoReady) {
      faceDetectedCountRef.current = 0;
      setAutoProgressCount(0);
      return;
    }

    const interval = setInterval(() => {
      if (faceDetected) {
        faceDetectedCountRef.current++;
        setAutoProgressCount(faceDetectedCountRef.current);
        console.log(`[Auto] Face detected count: ${faceDetectedCountRef.current}/6`);
        
        // After ~2 seconds (6 x 300ms), auto-proceed
        if (faceDetectedCountRef.current >= 6) {
          clearInterval(interval);
          console.log('[Auto] Proceeding to calibration...');
          toast.info('Calibration automatique...');
          startCalibration();
        }
      } else {
        faceDetectedCountRef.current = 0;
        setAutoProgressCount(0);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [step, faceDetected, modelsLoaded, videoReady]);

  // Start calibration before liveness challenges
  const startCalibration = useCallback(() => {
    setStep('calibration');
    setCalibrationStep('left');
    setCalibrationLeftAngle(null);
    setCalibrationRightAngle(null);
    setCalibrationProgress(0);
    setCalibrationJustCompleted(null);
    calibrationTransitioningRef.current = false;
    calibrationHoldCountRef.current = 0;
    faceDetectedCountRef.current = 0;
    setAutoProgressCount(0);
  }, []);

  // Start liveness detection with countdown
  const startLivenessDetection = useCallback(() => {
    setStep('liveness');
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    setChallengeCompleted([false]);
    setLivenessVerified(false);
    setNodDetected(false);
    setNodUpValidated(false);
    setNodDownValidated(false);
    baselinePitchRef.current = null;
    lastNodEventAtRef.current = 0;
    faceDetectedCountRef.current = 0;
    setAutoProgressCount(0);

    // Start 3-2-1 countdown before showing challenges
    setLivenessCountdown(3);
    const countdownInterval = window.setInterval(() => {
      setLivenessCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(countdownInterval);
          return null; // Countdown finished, show challenges
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Calibration detection - track max angles for each direction
  useEffect(() => {
    if (step !== 'calibration' || !faceDetected) return;

    const interval = window.setInterval(() => {
      // While showing the success checkmark, ignore detection to avoid double-triggers
      if (calibrationTransitioningRef.current) return;

      const CALIBRATION_TARGET_DEG = 3;
      const CALIBRATION_HOLD_FRAMES = 3;

      if (calibrationStep === 'left') {
        // Visual LEFT turn = NEGATIVE angle (due to mirrored video + face-api raw analysis)
        if (headAngle < -CALIBRATION_TARGET_DEG) {
          calibrationHoldCountRef.current++;
          setCalibrationProgress(
            (calibrationHoldCountRef.current / CALIBRATION_HOLD_FRAMES) * 100
          );

          // Track min (most negative) angle seen for left
          setCalibrationLeftAngle((prev) =>
            prev === null ? headAngle : Math.min(prev, headAngle)
          );

          if (calibrationHoldCountRef.current >= CALIBRATION_HOLD_FRAMES) {
            console.log(`[Calibration] LEFT captured: ${headAngle.toFixed(1)}°`);
            toast.success('Gauche calibré!');

            calibrationTransitioningRef.current = true;
            setCalibrationProgress(100);
            setCalibrationJustCompleted('left');

            window.setTimeout(() => {
              setCalibrationJustCompleted(null);
              setCalibrationStep('right');
              calibrationHoldCountRef.current = 0;
              setCalibrationProgress(0);
              calibrationTransitioningRef.current = false;
            }, 700);
          }
        } else {
          calibrationHoldCountRef.current = 0;
          setCalibrationProgress(0);
        }
      } else if (calibrationStep === 'right') {
        // Visual RIGHT turn = POSITIVE angle
        if (headAngle > CALIBRATION_TARGET_DEG) {
          calibrationHoldCountRef.current++;
          setCalibrationProgress(
            (calibrationHoldCountRef.current / CALIBRATION_HOLD_FRAMES) * 100
          );

          // Track max (most positive) angle seen for right
          setCalibrationRightAngle((prev) =>
            prev === null ? headAngle : Math.max(prev, headAngle)
          );

          if (calibrationHoldCountRef.current >= CALIBRATION_HOLD_FRAMES) {
            console.log(`[Calibration] RIGHT captured: ${headAngle.toFixed(1)}°`);
            toast.success('Droite calibré!');

            calibrationTransitioningRef.current = true;
            setCalibrationProgress(100);
            setCalibrationJustCompleted('right');

            window.setTimeout(() => {
              setCalibrationJustCompleted(null);
              setCalibrationStep('done');
              calibrationHoldCountRef.current = 0;
              setCalibrationProgress(0);
              calibrationTransitioningRef.current = false;
              startLivenessDetection();
            }, 700);
          }
        } else {
          calibrationHoldCountRef.current = 0;
          setCalibrationProgress(0);
        }
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [step, calibrationStep, faceDetected, headAngle, startLivenessDetection]);


  // Handle file upload fallback
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setCapturedImage(imageUrl);
      setStep('preview');
      setLivenessVerified(true);
    };
    reader.readAsDataURL(file);
  }, []);

  // Check challenge completion based on real face detection
  useEffect(() => {
    // Don't process challenges during countdown
    if (step !== 'liveness' || livenessVerified || !currentChallenge || livenessCountdown !== null) return;

    // Avoid double-triggering while we animate progress / switch to the next challenge
    if (challengeProgress > 0) return;
    if (challengeCompleted[currentChallengeIndex]) return;

    let completed = false;

    // Video display is mirrored (scaleX(-1)) but face-api sees raw video.
    // Visual LEFT turn → NEGATIVE headAngle (leftThreshold is negative)
    // Visual RIGHT turn → POSITIVE headAngle (rightThreshold is positive)
    switch (currentChallenge.type) {
      case 'nod':
        // Nod is complete when both UP and DOWN are validated
        if (nodUpValidated && nodDownValidated) {
          completed = true;
          console.log('[Liveness] Challenge NOD completed! (UP + DOWN validated)');
        }
        break;
      case 'turn_left':
        // Visual LEFT = negative angle, threshold is negative
        if (headAngle < leftThreshold) {
          completed = true;
          console.log(
            `[Liveness] Challenge TURN_LEFT completed! Angle: ${headAngle.toFixed(1)}° (threshold: ${leftThreshold.toFixed(1)}°)`
          );
        }
        break;
      case 'turn_right':
        // Visual RIGHT = positive angle, threshold is positive
        if (headAngle > rightThreshold) {
          completed = true;
          console.log(
            `[Liveness] Challenge TURN_RIGHT completed! Angle: ${headAngle.toFixed(1)}° (threshold: ${rightThreshold.toFixed(1)}°)`
          );
        }
        break;
      case 'smile':
        if (currentExpression === 'happy') {
          completed = true;
          console.log('[Liveness] Challenge SMILE completed!');
        }
        break;
    }

    if (!completed) return;

    // Mark as started immediately to prevent multiple intervals from being created
    setChallengeProgress(1);

    const progressInterval = window.setInterval(() => {
      setChallengeProgress((prev) => Math.min(100, prev + 20));
    }, 100);

    const idx = currentChallengeIndex;

    const finishTimeout = window.setTimeout(() => {
      window.clearInterval(progressInterval);
      setChallengeProgress(100);

      setChallengeCompleted((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });

      if (idx < selectedChallenges.length - 1) {
        window.setTimeout(() => {
          setCurrentChallengeIndex((prev) => prev + 1);
          setChallengeProgress(0);
        }, 300);
      } else {
        window.setTimeout(() => {
          setLivenessVerified(true);
          toast.success('Vérification de vivacité réussie!');
        }, 300);
      }
    }, 550);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(finishTimeout);
    };
  }, [
    step,
    livenessVerified,
    currentChallenge,
    livenessCountdown,
    challengeProgress,
    currentChallengeIndex,
    challengeCompleted,
    selectedChallenges.length,
    nodUpValidated,
    nodDownValidated,
    headAngle,
    headPitch,
    currentExpression,
    leftThreshold,
    rightThreshold,
  ]);

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

  // Capture photo and auto-upload
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    
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
    
    // Auto-upload immediately (skip preview step)
    setStep('uploading');
    setUploading(true);
    
    try {
      const response = await fetch(imageDataUrl);
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
      
      toast.success('Selfie enregistré - Vérification en cours...');
      onCaptureComplete(publicUrl);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'envoi du selfie');
      setStep('preview'); // Fallback to preview on error
    } finally {
      setUploading(false);
    }
  }, [stopCamera, user, onCaptureComplete]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setFaceDetected(false);
    setLivenessVerified(false);
    setCurrentChallengeIndex(0);
    setChallengeCompleted([false]);
    setNodDetected(false);
    setNodUpValidated(false);
    setNodDownValidated(false);
    baselinePitchRef.current = null;
    lastNodEventAtRef.current = 0;
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

  // Get challenge status indicator (accounting for mirrored display)
  const getChallengeStatus = () => {
    if (!currentChallenge) return '';
    
    const angleDisplay = `(${headAngle.toFixed(0)}°)`;
    
    switch (currentChallenge.type) {
      case 'nod':
        if (nodUpValidated && nodDownValidated) return '✅✅ Hochement validé!';
        if (nodUpValidated) return '✅ Montée OK - Maintenant baissez!';
        if (nodDownValidated) return '✅ Descente OK - Maintenant montez!';
        return '⬆️ Montez la tête une fois';
      case 'turn_left':
        // LEFT = positive angle (use calibrated threshold)
        if (headAngle > leftThreshold) {
          return `✅ Détecté! ${angleDisplay}`;
        } else if (headAngle > leftThreshold * 0.5) {
          return `↩️ Encore un peu... ${angleDisplay}`;
        }
        return `⬅️ Tournez la tête à gauche ${angleDisplay}`;
      case 'turn_right':
        // RIGHT = negative angle (use calibrated threshold)
        if (headAngle < rightThreshold) {
          return `✅ Détecté! ${angleDisplay}`;
        } else if (headAngle < rightThreshold * 0.5) {
          return `↪️ Encore un peu... ${angleDisplay}`;
        }
        return `➡️ Tournez la tête à droite ${angleDisplay}`;
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
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono max-w-[200px]">
        <div>readyState: {video?.readyState ?? 'N/A'}</div>
        <div>dim: {video?.videoWidth ?? 0}x{video?.videoHeight ?? 0}</div>
        <div>paused: {video?.paused ? 'Y' : 'N'} | ended: {video?.ended ? 'Y' : 'N'}</div>
        <div>track: {track?.readyState ?? 'none'}</div>
        <div>models: {modelsLoaded ? '✓' : '...'}</div>
        <div>face: {faceDetected ? '✓' : '✗'}</div>
        <div className="text-yellow-400 font-bold">angle: {headAngle.toFixed(1)}°</div>
        <div className="border-t border-white/30 mt-1 pt-1">
          <div>frames OK: {debugStats.framesOk}</div>
          <div>frames lost: {debugStats.framesLost}</div>
          <div>restarts: {debugStats.restarts}</div>
        </div>
        <Button 
          size="sm" 
          variant="secondary"
          className="mt-2 text-xs h-6 w-full"
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

        {/* Instructions Step */}
        {step === 'instructions' && (
          <div className="space-y-4 animate-fade-in">
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
          </div>
        )}

        {/* Loading Models Step */}
        {step === 'loading-models' && (
          <div className="py-8 text-center space-y-4 animate-fade-in">
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
          </div>
        )}

        {/* Camera + Liveness (shared video element) */}
        {(step === 'camera' || step === 'liveness' || step === 'calibration') && (
          <div className="space-y-4">
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
                <div className="relative aspect-square bg-black rounded-2xl">
                  <DebugInfo />

                  {/* Video element - mirrored for natural selfie view */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-2xl"
                    style={{ 
                      minWidth: '100%', 
                      minHeight: '100%',
                      transform: 'scaleX(-1)' // Mirror for selfie mode
                    }}
                  />

                  {/* Tap to play overlay */}
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

                  {/* Face guide overlay with directional arrows */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl">
                    {/* Arrow indicators during calibration - INVERTED: show where to turn */}
                    {/* LEFT calibration: show RIGHT arrow (user turns head right) */}
                    {step === 'calibration' && calibrationStep === 'left' && calibrationProgress < 100 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pulse">
                        <div className="bg-primary/80 rounded-full p-3">
                          <ChevronRight className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* RIGHT calibration: show LEFT arrow (user turns head left) */}
                    {step === 'calibration' && calibrationStep === 'right' && calibrationProgress < 100 && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 animate-pulse">
                        <div className="bg-primary/80 rounded-full p-3">
                          <ChevronLeft className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Liveness arrows - also inverted */}
                    {step === 'liveness' && currentChallenge?.type === 'turn_left' && livenessCountdown === null && !livenessVerified && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pulse">
                        <div className="bg-primary/80 rounded-full p-3">
                          <ChevronRight className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {step === 'liveness' && currentChallenge?.type === 'turn_right' && livenessCountdown === null && !livenessVerified && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 animate-pulse">
                        <div className="bg-primary/80 rounded-full p-3">
                          <ChevronLeft className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Face oval guide - slightly larger for reliability */}
                    <div
                      className={cn(
                        "w-56 h-72 rounded-[50%] border-4 transition-all duration-300",
                        step === 'calibration'
                          ? calibrationJustCompleted !== null
                            ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                            : "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                          : step === 'liveness'
                            ? livenessVerified
                              ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                              : "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            : faceDetected
                              ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                              : "border-white/50"
                      )}
                    >
                      {/* Checkmark when calibration step completed */}
                      {step === 'calibration' && calibrationJustCompleted !== null && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                            <Check className="h-10 w-10 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
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
                              ? `✅ Visage détecté - Démarrage dans ${Math.max(0, Math.ceil((6 - autoProgressCount) * 0.3))}s...`
                              : "Placez votre visage dans le cercle"
                        }
                      </p>
                      {/* Auto-progress bar */}
                      {faceDetected && modelsLoaded && videoReady && (
                        <div className="mt-2 mx-auto max-w-[200px]">
                          <Progress value={(autoProgressCount / 6) * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Calibration overlay */}
                  {step === 'calibration' && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                      <div className="flex flex-col items-center gap-2">
                        {calibrationJustCompleted !== null ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                              {calibrationJustCompleted === 'left' ? 'Gauche validé' : 'Droite validé'}
                            </h3>
                            <p className="text-white/90 text-base drop-shadow-lg">
                              {calibrationJustCompleted === 'left'
                                ? 'Prochaine étape: tournez la tête vers la droite'
                                : 'Démarrage des défis...'}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              {calibrationStep === 'left' ? (
                                <ChevronLeft className="h-10 w-10 text-yellow-500" />
                              ) : (
                                <ChevronRight className="h-10 w-10 text-yellow-500" />
                              )}
                            </div>
                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                              {calibrationStep === 'left' ? 'Calibration: Gauche' : 'Calibration: Droite'}
                            </h3>
                            <p className="text-white/90 text-base drop-shadow-lg">
                              {calibrationStep === 'left' ? 'Tournez la tête vers la gauche' : 'Tournez la tête vers la droite'}
                            </p>
                            <div className="w-[260px] max-w-[80vw] mt-1">
                              <Progress value={calibrationProgress} className="h-3" />
                            </div>
                            <p className="text-sm text-white/80 drop-shadow-lg">
                              Angle: {headAngle.toFixed(0)}° - Maintenez la position
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Liveness overlays */}
                  {step === 'liveness' && (
                    <>
                      {/* Initial 3-2-1 countdown before challenges start */}
                      {livenessCountdown !== null && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 rounded-2xl pointer-events-none">
                          <p className="text-white text-lg mb-4 font-medium drop-shadow-lg">Préparez-vous...</p>
                          <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center bg-primary/10">
                              <span className="text-7xl font-bold text-white animate-pulse drop-shadow-lg">{livenessCountdown}</span>
                            </div>
                          </div>
                          <p className="text-white/90 text-sm mt-4 drop-shadow-lg">Gardez votre visage visible</p>
                        </div>
                      )}

                      {/* Challenge instruction overlay - NO background card (keep video visible) */}
                      {!livenessVerified && currentChallenge && livenessCountdown === null && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                              <div className="text-primary scale-150 drop-shadow-lg">{currentChallenge.icon}</div>
                            </div>
                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">{currentChallenge.label}</h3>
                            <p className="text-white/90 text-base drop-shadow-lg">{currentChallenge.instruction}</p>
                            
                            {/* Nod status indicator with 2 checkboxes */}
                            {currentChallenge.type === 'nod' && (
                              <div className="flex flex-col items-center gap-2">
                                {/* Two validation indicators */}
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300",
                                    nodUpValidated
                                      ? "bg-green-500 text-white scale-105" 
                                      : "bg-white/20 text-white/70"
                                  )}>
                                    <span className="text-lg">{nodUpValidated ? '✅' : '⬆️'}</span>
                                    <span>Montée</span>
                                  </div>
                                  <div className={cn(
                                    "px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300",
                                    nodDownValidated
                                      ? "bg-green-500 text-white scale-105" 
                                      : "bg-white/20 text-white/70"
                                  )}>
                                    <span className="text-lg">{nodDownValidated ? '✅' : '⬇️'}</span>
                                    <span>Descente</span>
                                  </div>
                                </div>
                                {/* Dynamic instruction */}
                                <div className={cn(
                                  "px-4 py-2 rounded-full font-bold text-sm transition-all duration-200",
                                  (nodUpValidated && nodDownValidated)
                                    ? "bg-green-500 text-white" 
                                    : "bg-yellow-500/80 text-white animate-pulse"
                                )}>
                                  {nodUpValidated && nodDownValidated 
                                    ? "✅ Parfait! Capture en cours..." 
                                    : nodUpValidated 
                                      ? "⬇️ Maintenant baissez la tête!" 
                                      : nodDownValidated
                                        ? "⬆️ Maintenant montez la tête!"
                                        : "⬆️ Montez la tête une fois"}
                                </div>
                              </div>
                            )}
                            
                            <div className="w-[260px] max-w-[80vw] mt-1">
                              <Progress value={challengeProgress} className="h-3" />
                            </div>
                            <p className="text-sm text-white/80 drop-shadow-lg">{getChallengeStatus()}</p>
                          </div>
                        </div>
                      )}

                      {/* Success overlay - no motion */}
                      {livenessVerified && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl pointer-events-none">
                          <div className="bg-green-500 text-white rounded-full p-6">
                            <Check className="h-12 w-12" />
                          </div>
                        </div>
                      )}

                      {/* Photo countdown overlay - no motion */}
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl pointer-events-none">
                          <span className="text-8xl font-bold text-white">{countdown}</span>
                        </div>
                      )}

                      {/* Bottom progress indicators */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent rounded-b-2xl pointer-events-none">
                        <div className="flex items-center justify-center gap-3">
                          {selectedChallenges.map((challenge, index) => (
                            <div
                              key={index}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all",
                                challengeCompleted[index]
                                  ? 'bg-green-500 text-white'
                                  : index === currentChallengeIndex && livenessCountdown === null
                                    ? 'bg-primary text-white scale-110'
                                    : 'bg-white/30 text-white/70'
                              )}
                            >
                              {challengeCompleted[index] ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
                            </div>
                          ))}
                        </div>
                        <p className="text-white text-center text-sm mt-2">
                          {livenessVerified
                            ? "✅ Vivacité confirmée - Photo dans 3s..."
                            : livenessCountdown !== null
                              ? "Préparation..."
                              : `Défi ${currentChallengeIndex + 1}/${selectedChallenges.length}`
                          }
                        </p>
                      </div>
                    </>
                  )}
                </div>

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
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Importer
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      Gardez votre visage dans le cercle - la vérification démarre automatiquement
                    </p>
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
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && capturedImage && (
          <div className="space-y-4 animate-fade-in">
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
          </div>
        )}

        {/* Uploading Step */}
        {step === 'uploading' && (
          <div className="py-12 text-center space-y-4 animate-fade-in">
            <div className="relative mx-auto w-20 h-20">
              <Loader2 className="h-20 w-20 animate-spin text-primary" />
            </div>
            <div>
              <p className="font-semibold">Envoi en cours...</p>
              <p className="text-sm text-muted-foreground">
                Votre photo de profil est en cours d'envoi
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SelfieCapture;
