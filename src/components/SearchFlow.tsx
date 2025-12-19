import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { Search, Plane, CalendarIcon, MapPin, ChevronRight, Check, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/components/CountrySelect";
import { hapticImpact, hapticNotification } from "@/hooks/useHaptics";
import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface SearchFlowProps {
  onSearch: (departure: string, arrival: string, startDate?: Date, endDate?: Date) => void;
}

type DrawerType = "departure" | "arrival" | "dates" | null;

export const SearchFlow = ({ onSearch }: SearchFlowProps) => {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState("");

  // Get all cities from all countries
  const allCities = useMemo(() => {
    const cities: { city: string; country: string; flag: string }[] = [];
    COUNTRIES.forEach(country => {
      country.cities.forEach(city => {
        cities.push({ city, country: country.name, flag: country.flag });
      });
    });
    return cities;
  }, []);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return allCities;
    const query = searchQuery.toLowerCase();
    return allCities.filter(
      item => 
        item.city.toLowerCase().includes(query) || 
        item.country.toLowerCase().includes(query)
    );
  }, [allCities, searchQuery]);

  const openDrawer = async (drawer: DrawerType) => {
    await hapticImpact(ImpactStyle.Light);
    setSearchQuery("");
    setActiveDrawer(drawer);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setSearchQuery("");
  };

  const selectDeparture = async (city: string) => {
    await hapticImpact(ImpactStyle.Medium);
    setDeparture(city);
    closeDrawer();
  };

  const selectArrival = async (city: string) => {
    await hapticImpact(ImpactStyle.Medium);
    setArrival(city);
    closeDrawer();
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    await hapticImpact(ImpactStyle.Light);
    
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(undefined);
    } else {
      // Complete the range
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      await hapticImpact(ImpactStyle.Medium);
      closeDrawer();
    }
  };

  const handleSearch = async () => {
    await hapticNotification(NotificationType.Success);
    onSearch(departure, arrival, startDate, endDate);
  };

  const resetField = async (field: "departure" | "arrival" | "dates") => {
    await hapticImpact(ImpactStyle.Light);
    if (field === "departure") {
      setDeparture("");
      setArrival("");
      setStartDate(undefined);
      setEndDate(undefined);
    } else if (field === "arrival") {
      setArrival("");
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  // Determine current step
  const currentStep = !departure ? 1 : !arrival ? 2 : (!startDate || !endDate) ? 3 : 4;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {/* Step 1: Departure - Always visible */}
        <motion.div
          key="departure"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {!departure ? (
            <Button
              variant="outline"
              className="w-full h-14 justify-between text-left font-normal bg-card/80 backdrop-blur-sm shadow-lg border-primary/30 hover:border-primary/50 transition-all duration-200 active:scale-[0.98]"
              onClick={() => openDrawer("departure")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <span className="text-base">Envoyer depuis...</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
              <div className="p-1.5 rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium flex-1">{departure}</span>
              <button
                onClick={() => resetField("departure")}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Step 2: Arrival - Shows after departure */}
        {departure && (
          <motion.div
            key="arrival"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {/* Plane divider */}
            <div className="flex justify-center py-2">
              <div className="bg-gradient-sky rounded-full p-1.5">
                <Plane className="h-4 w-4 text-white rotate-90" />
              </div>
            </div>

            {!arrival ? (
              <Button
                variant="outline"
                className="w-full h-14 justify-between text-left font-normal bg-card/80 backdrop-blur-sm shadow-lg border-primary/30 hover:border-primary/50 transition-all duration-200 active:scale-[0.98]"
                onClick={() => openDrawer("arrival")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-base">Vers...</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                <div className="p-1.5 rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium flex-1">{arrival}</span>
                <button
                  onClick={() => resetField("arrival")}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Date range (optional) + Search Button - Shows after arrival */}
        {arrival && (
          <motion.div
            key="dates-and-search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="pt-2 space-y-3"
          >
            {/* Optional dates */}
            {(!startDate || !endDate) ? (
              <Button
                variant="outline"
                className="w-full h-12 justify-between text-left font-normal bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
                onClick={() => openDrawer("dates")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {startDate ? `Entre le ${format(startDate, "d MMM", { locale: fr })} et...` : "Ajouter des dates (optionnel)"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                <div className="p-1.5 rounded-full bg-primary/10">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium flex-1 text-sm">
                  Entre le {format(startDate, "d MMM", { locale: fr })} et le {format(endDate, "d MMM yyyy", { locale: fr })}
                </span>
                <button
                  onClick={() => resetField("dates")}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Search Button - Always visible after arrival */}
            <Button 
              size="lg" 
              className="h-14 w-full bg-gradient-sky transition-all duration-200 text-base font-semibold active:scale-[0.98]"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Rechercher
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Departure City Drawer */}
      <Drawer open={activeDrawer === "departure"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Envoyer depuis
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ville..."
                className="pl-10 h-12 bg-muted/50 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4 max-h-[50vh]">
            <div className="space-y-1">
              {filteredCities.map((item, index) => (
                <button
                  key={`${item.city}-${item.country}-${index}`}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl",
                    "transition-all duration-150 active:scale-[0.98]",
                    "hover:bg-accent/50 active:bg-accent"
                  )}
                  onClick={() => selectDeparture(item.city)}
                >
                  <span className="text-2xl">{item.flag}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-base">{item.city}</span>
                    <span className="text-sm text-muted-foreground">{item.country}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Arrival City Drawer */}
      <Drawer open={activeDrawer === "arrival"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Destination
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ville..."
                className="pl-10 h-12 bg-muted/50 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4 max-h-[50vh]">
            <div className="space-y-1">
              {filteredCities
                .filter(item => item.city !== departure)
                .map((item, index) => (
                  <button
                    key={`${item.city}-${item.country}-${index}`}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-xl",
                      "transition-all duration-150 active:scale-[0.98]",
                      "hover:bg-accent/50 active:bg-accent"
                    )}
                    onClick={() => selectArrival(item.city)}
                  >
                    <span className="text-2xl">{item.flag}</span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-base">{item.city}</span>
                      <span className="text-sm text-muted-foreground">{item.country}</span>
                    </div>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Date Range Drawer */}
      <Drawer open={activeDrawer === "dates"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent>
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {!startDate ? "À partir du..." : "Jusqu'au..."}
            </DrawerTitle>
            {startDate && !endDate && (
              <p className="text-sm text-muted-foreground mt-1">
                À partir du {format(startDate, "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </DrawerHeader>
          <div className="flex justify-center p-4">
            <Calendar
              mode="single"
              selected={startDate && !endDate ? undefined : endDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
              modifiers={{
                range_start: startDate ? [startDate] : [],
                range_end: endDate ? [endDate] : []
              }}
              modifiersStyles={{
                range_start: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' },
                range_end: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' }
              }}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
