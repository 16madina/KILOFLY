import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean, signatureData: string | null) => void;
  className?: string;
  disabled?: boolean;
}

const SignaturePad = ({ onSignatureChange, className, disabled = false }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCoordinates = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    lastPointRef.current = coords;
    setIsDrawing(true);
  }, [getCoordinates, disabled]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !lastPointRef.current) return;

    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    // Use a dark blue color that's visible on light backgrounds
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = coords;

    if (!hasSignature) {
      setHasSignature(true);
      onSignatureChange(true, canvas.toDataURL());
    }
  }, [isDrawing, hasSignature, getCoordinates, onSignatureChange]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && canvasRef.current) {
      onSignatureChange(hasSignature, canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(false, null);
  }, [onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    // Use a light cream/white background that works in both themes
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Signature électronique
        </p>
        {hasSignature && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Signé
          </div>
        )}
      </div>
      
      <div className="relative rounded-lg border-2 border-primary/40 overflow-hidden bg-[#fafafa] shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-24 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">
              Signez ici avec votre doigt ou souris
            </p>
          </div>
        )}
      </div>

      {hasSignature && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="w-full text-xs"
        >
          <Eraser className="h-3 w-3 mr-1" />
          Effacer la signature
        </Button>
      )}
    </div>
  );
};

export default SignaturePad;
