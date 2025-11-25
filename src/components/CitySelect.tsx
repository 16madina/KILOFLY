import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { COUNTRIES, CountryData } from "./CountrySelect";

interface CitySelectProps {
  countryName: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const CitySelect = ({ countryName, value, onChange, required }: CitySelectProps) => {
  const country = COUNTRIES.find(c => c.name === countryName);
  const cities = country?.cities || [];

  if (!country || cities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="city-select">Ville *</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        required={required}
      >
        <SelectTrigger id="city-select" className="w-full">
          <SelectValue placeholder="Sélectionnez une ville" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-[300px]">
          <SelectGroup>
            {cities.map((city) => (
              <SelectItem 
                key={city} 
                value={city}
                className="cursor-pointer hover:bg-accent"
              >
                {city}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
