import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Plane, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingMapProps {
  departure: string;
  arrival: string;
  currentStatus: string;
  departureCoords?: { lat: number; lng: number };
  arrivalCoords?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number; name?: string };
}

// Estimated coordinates for common cities (simplified)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Abidjan': { lat: 5.3600, lng: -4.0083 },
  'Dakar': { lat: 14.6937, lng: -17.4441 },
  'Lomé': { lat: 6.1375, lng: 1.2123 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
};

const STATUS_PROGRESS: Record<string, number> = {
  'pending': 0,
  'approved': 0.1,
  'payment_completed': 0.15,
  'pickup_scheduled': 0.2,
  'picked_up': 0.25,
  'in_transit': 0.5,
  'in_progress': 0.5,
  'arrived': 0.85,
  'out_for_delivery': 0.95,
  'delivered': 1,
};

export function TrackingMap({ 
  departure, 
  arrival, 
  currentStatus,
  currentLocation 
}: TrackingMapProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const targetProgress = STATUS_PROGRESS[currentStatus] ?? 0;
    setProgress(targetProgress);
  }, [currentStatus]);

  const getCityCoords = (city: string) => {
    // Try to find a matching city
    const matchedCity = Object.keys(CITY_COORDS).find(
      c => city.toLowerCase().includes(c.toLowerCase())
    );
    return matchedCity ? CITY_COORDS[matchedCity] : null;
  };

  const departureCoords = getCityCoords(departure);
  const arrivalCoords = getCityCoords(arrival);

  // Calculate current position on the path
  const currentX = 10 + (progress * 80); // 10% to 90% of width

  return (
    <div className="relative w-full h-48 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950 dark:to-slate-900 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-primary/30" />
        <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-primary/20" />
      </div>

      {/* Flight path */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50">
        {/* Path curve */}
        <path
          d="M 10 35 Q 50 5 90 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          className="text-primary/30"
        />
        
        {/* Progress path */}
        <motion.path
          d="M 10 35 Q 50 5 90 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          className="text-primary"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      {/* Departure point */}
      <motion.div
        className="absolute left-[8%] bottom-[25%] flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <MapPin className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="mt-1 text-xs font-medium text-foreground truncate max-w-[60px]">
          {departure.split(',')[0]}
        </span>
      </motion.div>

      {/* Arrival point */}
      <motion.div
        className="absolute right-[8%] bottom-[25%] flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <span className="mt-1 text-xs font-medium text-foreground truncate max-w-[60px]">
          {arrival.split(',')[0]}
        </span>
      </motion.div>

      {/* Moving package/plane indicator */}
      {progress > 0 && progress < 1 && (
        <motion.div
          className="absolute"
          style={{
            left: `${currentX}%`,
            bottom: `${35 + Math.sin(progress * Math.PI) * 30}%`,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <motion.div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-xl",
              progress < 0.5 ? "bg-sky-500" : "bg-orange-500"
            )}
            animate={{
              y: [0, -4, 0],
              rotate: progress < 0.5 ? [0, 5, -5, 0] : 0,
            }}
            transition={{
              y: { duration: 2, repeat: Infinity },
              rotate: { duration: 3, repeat: Infinity },
            }}
          >
            {progress < 0.7 ? (
              <Plane className="w-5 h-5 text-white" />
            ) : (
              <Package className="w-5 h-5 text-white" />
            )}
          </motion.div>
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-current opacity-30 blur-md"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Delivered celebration */}
      {progress === 1 && (
        <motion.div
          className="absolute right-[8%] bottom-[25%]"
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, times: [0, 0.5, 1] }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-emerald-400"
              initial={{ opacity: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                x: Math.cos(i * 60 * Math.PI / 180) * 30,
                y: Math.sin(i * 60 * Math.PI / 180) * 30,
              }}
              transition={{ duration: 1, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
            />
          ))}
        </motion.div>
      )}

      {/* Current location overlay if GPS data available */}
      {currentLocation && (
        <div className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">Position actuelle:</span>
            <span className="font-medium">
              {currentLocation.name || `${currentLocation.lat.toFixed(2)}°, ${currentLocation.lng.toFixed(2)}°`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
