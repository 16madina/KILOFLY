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
import { Search, Plane, CalendarIcon, MapPin, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/components/CountrySelect";
import { hapticImpact, hapticNotification } from "@/hooks/useHaptics";
import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchFlowProps {
  onSearch: (departure: string, arrival: string, departureDate?: Date, arrivalDate?: Date) => void;
}

type Step = "idle" | "departure" | "departure-date" | "arrival" | "arrival-date";

export const SearchFlow = ({ onSearch }: SearchFlowProps) => {
  const [step, setStep] = useState<Step>("idle");
  const [departure, setDeparture] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [arrival, setArrival] = useState("");
  const [arrivalDate, setArrivalDate] = useState<Date>();
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

  const openStep = async (newStep: Step) => {
    await hapticImpact(ImpactStyle.Light);
    setSearchQuery("");
    setStep(newStep);
  };

  const closeDrawer = () => {
    setStep("idle");
    setSearchQuery("");
  };

  const selectDeparture = async (city: string) => {
    await hapticImpact(ImpactStyle.Medium);
    setDeparture(city);
    setStep("departure-date");
  };

  const selectDepartureDate = async (date: Date | undefined) => {
    if (date) {
      await hapticImpact(ImpactStyle.Medium);
      setDepartureDate(date);
      setStep("arrival");
    }
  };

  const selectArrival = async (city: string) => {
    await hapticImpact(ImpactStyle.Medium);
    setArrival(city);
    setStep("arrival-date");
  };

  const selectArrivalDate = async (date: Date | undefined) => {
    if (date) {
      await hapticImpact(ImpactStyle.Medium);
      setArrivalDate(date);
      setStep("idle");
    }
  };

  const handleSearch = async () => {
    await hapticNotification(NotificationType.Success);
    onSearch(departure, arrival, departureDate, arrivalDate);
  };

  const isComplete = departure && departureDate && arrival && arrivalDate;

  return (
    <div className="space-y-3">
      {/* Departure City Button */}
      <Button
        variant="outline"
        className={cn(
          "w-full h-14 justify-between text-left font-normal bg-card shadow-card border-border/50",
          "transition-all duration-200 active:scale-[0.98]",
          departure && "border-primary/50"
        )}
        onClick={() => openStep("departure")}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            departure ? "bg-primary/10" : "bg-muted"
          )}>
            <MapPin className={cn("h-4 w-4", departure ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Ville de départ</span>
            <span className={cn("text-sm", !departure && "text-muted-foreground")}>
              {departure || "Sélectionner..."}
            </span>
          </div>
        </div>
        {departure ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Departure Date Button */}
      <Button
        variant="outline"
        className={cn(
          "w-full h-14 justify-between text-left font-normal bg-card shadow-card border-border/50",
          "transition-all duration-200 active:scale-[0.98]",
          !departure && "opacity-50 pointer-events-none",
          departureDate && "border-primary/50"
        )}
        onClick={() => openStep("departure-date")}
        disabled={!departure}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            departureDate ? "bg-primary/10" : "bg-muted"
          )}>
            <CalendarIcon className={cn("h-4 w-4", departureDate ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Date de départ</span>
            <span className={cn("text-sm", !departureDate && "text-muted-foreground")}>
              {departureDate ? format(departureDate, "PPP", { locale: fr }) : "Sélectionner..."}
            </span>
          </div>
        </div>
        {departureDate ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Plane Icon Divider */}
      <div className="flex justify-center py-1">
        <div className="bg-gradient-sky rounded-full p-2">
          <Plane className="h-4 w-4 text-white rotate-90" />
        </div>
      </div>

      {/* Arrival City Button */}
      <Button
        variant="outline"
        className={cn(
          "w-full h-14 justify-between text-left font-normal bg-card shadow-card border-border/50",
          "transition-all duration-200 active:scale-[0.98]",
          !departureDate && "opacity-50 pointer-events-none",
          arrival && "border-primary/50"
        )}
        onClick={() => openStep("arrival")}
        disabled={!departureDate}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            arrival ? "bg-primary/10" : "bg-muted"
          )}>
            <MapPin className={cn("h-4 w-4", arrival ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Destination</span>
            <span className={cn("text-sm", !arrival && "text-muted-foreground")}>
              {arrival || "Sélectionner..."}
            </span>
          </div>
        </div>
        {arrival ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Arrival Date Button */}
      <Button
        variant="outline"
        className={cn(
          "w-full h-14 justify-between text-left font-normal bg-card shadow-card border-border/50",
          "transition-all duration-200 active:scale-[0.98]",
          !arrival && "opacity-50 pointer-events-none",
          arrivalDate && "border-primary/50"
        )}
        onClick={() => openStep("arrival-date")}
        disabled={!arrival}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            arrivalDate ? "bg-primary/10" : "bg-muted"
          )}>
            <CalendarIcon className={cn("h-4 w-4", arrivalDate ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Date d'arrivée</span>
            <span className={cn("text-sm", !arrivalDate && "text-muted-foreground")}>
              {arrivalDate ? format(arrivalDate, "PPP", { locale: fr }) : "Sélectionner..."}
            </span>
          </div>
        </div>
        {arrivalDate ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Search Button */}
      <Button 
        size="lg" 
        className={cn(
          "h-14 w-full bg-gradient-sky transition-all duration-200 text-base font-semibold mt-2",
          "active:scale-[0.98]",
          isComplete ? "opacity-100" : "opacity-70"
        )}
        onClick={handleSearch}
      >
        <Search className="h-5 w-5 mr-2" />
        Rechercher
      </Button>

      {/* Departure City Drawer */}
      <Drawer open={step === "departure"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Ville de départ
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ville..."
                className="pl-10 h-11 bg-muted/50"
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
                    "w-full flex items-center gap-3 p-3 rounded-xl",
                    "transition-all duration-150 active:scale-[0.98]",
                    "hover:bg-accent/50 active:bg-accent",
                    departure === item.city && "bg-primary/10 border border-primary/30"
                  )}
                  onClick={() => selectDeparture(item.city)}
                >
                  <span className="text-2xl">{item.flag}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{item.city}</span>
                    <span className="text-xs text-muted-foreground">{item.country}</span>
                  </div>
                  {departure === item.city && (
                    <Check className="h-4 w-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Departure Date Drawer */}
      <Drawer open={step === "departure-date"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent>
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Date de départ
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex justify-center p-4">
            <Calendar
              mode="single"
              selected={departureDate}
              onSelect={selectDepartureDate}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Arrival City Drawer */}
      <Drawer open={step === "arrival"} onOpenChange={(open) => !open && closeDrawer()}>
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
                className="pl-10 h-11 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4 max-h-[50vh]">
            <div className="space-y-1">
              {filteredCities
                .filter(item => item.city !== departure) // Exclude departure city
                .map((item, index) => (
                  <button
                    key={`${item.city}-${item.country}-${index}`}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl",
                      "transition-all duration-150 active:scale-[0.98]",
                      "hover:bg-accent/50 active:bg-accent",
                      arrival === item.city && "bg-primary/10 border border-primary/30"
                    )}
                    onClick={() => selectArrival(item.city)}
                  >
                    <span className="text-2xl">{item.flag}</span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.city}</span>
                      <span className="text-xs text-muted-foreground">{item.country}</span>
                    </div>
                    {arrival === item.city && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Arrival Date Drawer */}
      <Drawer open={step === "arrival-date"} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent>
          <DrawerHeader className="border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Date d'arrivée
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex justify-center p-4">
            <Calendar
              mode="single"
              selected={arrivalDate}
              onSelect={selectArrivalDate}
              disabled={(date) => date < (departureDate || new Date())}
              initialFocus
              className="p-3 pointer-events-auto"
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
