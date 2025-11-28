import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePinch, useDrag } from "@use-gesture/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

const PinchZoomImage = ({ src, alt, className, containerClassName }: PinchZoomImageProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Double tap to zoom
  const handleDoubleTap = () => {
    if (!isZoomed) {
      setIsZoomed(true);
      setScale(2);
    } else {
      handleClose();
    }
  };

  // Close zoom view
  const handleClose = () => {
    setIsZoomed(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pinch gesture for zoom
  const bindPinch = usePinch(
    (state) => {
      if (!isZoomed) return;
      
      const newScale = Math.max(1, Math.min(state.offset[0], 4));
      setScale(newScale);
      
      // Reset position if zoomed out completely
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    },
    {
      scaleBounds: { min: 1, max: 4 },
      rubberband: true,
    }
  );

  // Drag gesture for panning when zoomed
  const bindDrag = useDrag(
    (state) => {
      if (!isZoomed || scale <= 1) return;
      
      const [dx, dy] = state.offset;
      const maxX = (scale - 1) * 150;
      const maxY = (scale - 1) * 150;
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, dx)),
        y: Math.max(-maxY, Math.min(maxY, dy)),
      });
    },
    {
      from: [position.x, position.y],
    }
  );

  return (
    <>
      {/* Thumbnail */}
      <div className={cn("relative cursor-pointer", containerClassName)}>
        <img
          src={src}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          onDoubleClick={handleDoubleTap}
          onClick={() => {
            // Single click opens zoom view without scaling
            setIsZoomed(true);
          }}
        />
      </div>

      {/* Fullscreen Zoom View */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={(e) => {
              // Close if clicking background
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </motion.button>

            {/* Zoomable Image */}
            <div
              {...bindPinch()}
              {...bindDrag()}
              onDoubleClick={handleDoubleTap}
              className="touch-none select-none max-w-full max-h-full p-4"
            >
              <motion.img
                src={src}
                alt={alt}
                className="max-w-full max-h-[90vh] object-contain"
                draggable={false}
                style={{
                  scale,
                  x: position.x,
                  y: position.y,
                }}
              />
            </div>

            {/* Zoom Indicator */}
            {scale > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium"
              >
                {Math.round(scale * 100)}%
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PinchZoomImage;
