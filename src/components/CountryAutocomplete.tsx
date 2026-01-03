import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORLD_COUNTRIES } from "@/data/worldCities";

interface CountryAutocompleteProps {
  value: string;
  onChange: (country: string, countryCode: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const CountryAutocomplete = ({
  value,
  onChange,
  placeholder = "Rechercher un pays...",
  label,
  required,
  className,
}: CountryAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter countries based on query
  const filteredCountries = useMemo(() => {
    if (!query || query.length < 1) {
      // Show popular countries when empty
      const popularCountries = ["FR", "CI", "CA", "SN", "TG", "BJ", "CM", "MA", "BE", "US"];
      return WORLD_COUNTRIES
        .filter(c => popularCountries.includes(c.code))
        .sort((a, b) => popularCountries.indexOf(a.code) - popularCountries.indexOf(b.code));
    }

    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return WORLD_COUNTRIES
      .filter(item => {
        const normalizedName = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedName.includes(normalizedQuery);
      })
      .slice(0, 15);
  }, [query]);

  // Update query when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSelect = (country: { code: string; name: string; flag: string }) => {
    setQuery(country.name);
    onChange(country.name, country.code);
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    setQuery("");
    onChange("", "");
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
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          handleSelect(filteredCountries[highlightedIndex]);
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
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
      {isOpen && filteredCountries.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {!query && (
                <p className="px-3 py-2 text-xs text-muted-foreground font-medium">
                  Pays populaires
                </p>
              )}
              {filteredCountries.map((country, index) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left",
                    index === highlightedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="text-2xl flex-shrink-0">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {isOpen && query && filteredCountries.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun pays trouvé pour "{query}"
          </p>
        </div>
      )}
    </div>
  );
};
