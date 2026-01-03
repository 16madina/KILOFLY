import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORLD_CITIES, getCitiesByCountry, WORLD_COUNTRIES } from "@/data/worldCities";

// Keep the old interface for backward compatibility
export interface CountryData {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
  cities: string[];
}

// Map WORLD_COUNTRIES to the old format for components that still use it
export const COUNTRIES: CountryData[] = WORLD_COUNTRIES.map(c => ({
  code: c.code,
  name: c.name,
  dial_code: getDialCode(c.code),
  flag: c.flag,
  cities: getCitiesByCountry(c.code).map(city => city.city)
}));

function getDialCode(countryCode: string): string {
  const dialCodes: Record<string, string> = {
    "FR": "+33", "CI": "+225", "SN": "+221", "CA": "+1", "TG": "+228",
    "BJ": "+229", "CM": "+237", "MA": "+212", "CD": "+243", "BE": "+32",
    "CH": "+41", "DE": "+49", "GB": "+44", "ES": "+34", "PT": "+351",
    "IT": "+39", "NL": "+31", "PL": "+48", "AT": "+43", "SE": "+46",
    "NO": "+47", "DK": "+45", "FI": "+358", "GR": "+30", "CZ": "+420",
    "HU": "+36", "IE": "+353", "RO": "+40", "BG": "+359", "HR": "+385",
    "RS": "+381", "UA": "+380", "RU": "+7", "US": "+1", "MX": "+52",
    "BR": "+55", "AR": "+54", "CO": "+57", "PE": "+51", "CL": "+56",
    "VE": "+58", "EC": "+593", "BO": "+591", "UY": "+598", "PY": "+595",
    "CN": "+86", "JP": "+81", "KR": "+82", "IN": "+91", "TH": "+66",
    "VN": "+84", "SG": "+65", "MY": "+60", "ID": "+62", "PH": "+63",
    "AE": "+971", "SA": "+966", "QA": "+974", "KW": "+965", "BH": "+973",
    "OM": "+968", "LB": "+961", "JO": "+962", "IL": "+972", "TR": "+90",
    "PK": "+92", "BD": "+880", "LK": "+94", "NP": "+977", "KH": "+855",
    "MM": "+95", "AU": "+61", "NZ": "+64", "DZ": "+213", "TN": "+216",
    "EG": "+20", "ZA": "+27", "KE": "+254", "ET": "+251", "TZ": "+255",
    "GH": "+233", "NG": "+234", "GA": "+241", "CG": "+242", "ML": "+223",
    "BF": "+226", "NE": "+227", "GN": "+224", "RW": "+250", "MR": "+222",
    "MG": "+261", "MU": "+230", "RE": "+262", "HT": "+509", "DO": "+1",
    "CU": "+53", "JM": "+1", "PA": "+507", "CR": "+506", "MQ": "+596",
    "GP": "+590", "GF": "+594", "NC": "+687", "PF": "+689", "FJ": "+679",
    "HK": "+852"
  };
  return dialCodes[countryCode] || "+00";
}

interface CitySelectProps {
  countryName: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const CitySelect = ({ countryName, value, onChange, required }: CitySelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Find country by name and get cities
  const country = WORLD_COUNTRIES.find(c => c.name === countryName);
  const cities = country ? getCitiesByCountry(country.code) : [];

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return cities;
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cities.filter(c => 
      c.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)
    );
  }, [cities, searchQuery]);

  if (!country || cities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="city-select">Ville *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12"
          >
            {value ? (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {value}
              </span>
            ) : (
              <span className="text-muted-foreground">Sélectionnez une ville</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border-border z-50" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Rechercher une ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {filteredCities.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune ville trouvée
                </p>
              ) : (
                filteredCities.map((city) => (
                  <button
                    key={city.city}
                    onClick={() => {
                      onChange(city.city);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm",
                      "hover:bg-accent transition-colors",
                      value === city.city && "bg-accent"
                    )}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{city.city}</span>
                    {value === city.city && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
