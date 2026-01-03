import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORLD_COUNTRIES, getCitiesByCountry } from "@/data/worldCities";

// Re-export for backward compatibility
export interface CountryData {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
  cities: string[];
}

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

// Legacy COUNTRIES export for backward compatibility
export const COUNTRIES: CountryData[] = WORLD_COUNTRIES.map(c => ({
  code: c.code,
  name: c.name,
  dial_code: getDialCode(c.code),
  flag: c.flag,
  cities: getCitiesByCountry(c.code).map(city => city.city)
}));

interface CountrySelectProps {
  value: string;
  onChange: (value: string, dialCode: string) => void;
  required?: boolean;
}

export const CountrySelect = ({ value, onChange, required }: CountrySelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCountry = WORLD_COUNTRIES.find(c => c.name === value);

  // Filter countries based on search with accent-insensitive matching
  const filteredCountries = useMemo(() => {
    if (!searchQuery) {
      // Show popular countries first when no search
      const popularCodes = ["FR", "CI", "CA", "SN", "TG", "BJ", "CM", "MA", "CD", "BE", "US", "GB"];
      const popular = WORLD_COUNTRIES.filter(c => popularCodes.includes(c.code));
      const others = WORLD_COUNTRIES.filter(c => !popularCodes.includes(c.code));
      return [...popular, ...others];
    }
    
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return WORLD_COUNTRIES.filter(c => 
      c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (country: typeof WORLD_COUNTRIES[0]) => {
    onChange(country.name, getDialCode(country.code));
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="country-select">Pays *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12"
          >
            {selectedCountry ? (
              <span className="flex items-center gap-2">
                <span className="text-xl">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Sélectionnez un pays
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border-border z-50" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Rechercher un pays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {!searchQuery && (
                <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
                  Pays populaires
                </p>
              )}
              {filteredCountries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun pays trouvé
                </p>
              ) : (
                filteredCountries.map((country, index) => (
                  <button
                    key={country.code}
                    onClick={() => handleSelect(country)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2.5 rounded-md",
                      "hover:bg-accent transition-colors text-left",
                      value === country.name && "bg-accent"
                    )}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{country.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {getDialCode(country.code)}
                      </span>
                    </div>
                    {value === country.name && (
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
