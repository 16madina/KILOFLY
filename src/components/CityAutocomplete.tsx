import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORLD_CITIES, CityData } from "@/data/worldCities";

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, country?: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  excludeCity?: string;
  className?: string;
}

export const CityAutocomplete = ({
  value,
  onChange,
  placeholder = "Rechercher une ville...",
  label,
  required,
  excludeCity,
  className,
}: CityAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter cities based on query
  const filteredCities = useMemo(() => {
    if (!query || query.length < 1) {
      // Show popular destinations when empty
      const popularCities = ["Paris", "Abidjan", "Montréal", "Dakar", "Lomé", "Casablanca", "Douala", "Bruxelles"];
      return WORLD_CITIES
        .filter(c => popularCities.includes(c.city) && c.city !== excludeCity)
        .slice(0, 8);
    }

    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return WORLD_CITIES
      .filter(item => {
        if (item.city === excludeCity) return false;
        const normalizedCity = item.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedCountry = item.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedCity.includes(normalizedQuery) || normalizedCountry.includes(normalizedQuery);
      })
      .slice(0, 15);
  }, [query, excludeCity]);

  // Update query when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSelect = (city: CityData) => {
    setQuery(city.city);
    onChange(city.city, city.country);
    setIsOpen(false);
    setHighlightedIndex(0);
    // Blur input to dismiss keyboard on mobile
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCities[highlightedIndex]) {
          handleSelect(filteredCities[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label className="mb-2 block">
          {label} {required && "*"}
        </Label>
      )}
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div 
          ref={listRef}
          className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-lg shadow-xl overflow-hidden"
          style={{ maxHeight: '60vh' }}
        >
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {!query && (
                <p className="px-3 py-2 text-xs text-muted-foreground font-medium">
                  Destinations populaires
                </p>
              )}
              {filteredCities.map((city, index) => (
                <button
                  key={`${city.city}-${city.countryCode}-${index}`}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left",
                    index === highlightedIndex 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent/50"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="text-xl flex-shrink-0">{city.flag}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{city.city}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {city.country}
                    </span>
                  </div>
                  <MapPin className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {isOpen && query && filteredCities.length === 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-lg shadow-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune ville trouvée pour "{query}"
          </p>
        </div>
      )}
    </div>
  );
};
