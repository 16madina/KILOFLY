import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface CountryData {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
  cities: string[];
}

export const COUNTRIES: CountryData[] = [
  {
    code: "FR",
    name: "France",
    dial_code: "+33",
    flag: "🇫🇷",
    cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"]
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    dial_code: "+225",
    flag: "🇨🇮",
    cities: ["Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro", "Korhogo", "Man", "Divo", "Gagnoa", "Abengourou"]
  },
  {
    code: "SN",
    name: "Sénégal",
    dial_code: "+221",
    flag: "🇸🇳",
    cities: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba", "Mbour", "Rufisque", "Louga", "Tambacounda"]
  },
  {
    code: "CA",
    name: "Canada",
    dial_code: "+1",
    flag: "🇨🇦",
    cities: ["Montréal", "Toronto", "Vancouver", "Ottawa", "Calgary", "Edmonton", "Québec", "Winnipeg", "Hamilton", "Gatineau"]
  },
  {
    code: "TG",
    name: "Togo",
    dial_code: "+228",
    flag: "🇹🇬",
    cities: ["Lomé", "Sokodé", "Kara", "Atakpamé", "Kpalimé", "Dapaong", "Tsévié", "Aného", "Bassar", "Mango"]
  },
  {
    code: "BJ",
    name: "Bénin",
    dial_code: "+229",
    flag: "🇧🇯",
    cities: ["Cotonou", "Porto-Novo", "Parakou", "Djougou", "Bohicon", "Kandi", "Lokossa", "Ouidah", "Abomey", "Natitingou"]
  },
  {
    code: "CM",
    name: "Cameroun",
    dial_code: "+237",
    flag: "🇨🇲",
    cities: ["Douala", "Yaoundé", "Garoua", "Bamenda", "Bafoussam", "Maroua", "Ngaoundéré", "Bertoua", "Limbe", "Ebolowa"]
  },
  {
    code: "MA",
    name: "Maroc",
    dial_code: "+212",
    flag: "🇲🇦",
    cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda", "Kénitra", "Tétouan"]
  },
  {
    code: "CD",
    name: "RD Congo",
    dial_code: "+243",
    flag: "🇨🇩",
    cities: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani", "Kananga", "Likasi", "Kolwezi", "Goma", "Bukavu", "Matadi"]
  },
  {
    code: "BE",
    name: "Belgique",
    dial_code: "+32",
    flag: "🇧🇪",
    cities: ["Bruxelles", "Anvers", "Gand", "Charleroi", "Liège", "Bruges", "Namur", "Louvain", "Mons", "Malines"]
  }
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string, dialCode: string) => void;
  required?: boolean;
}

export const CountrySelect = ({ value, onChange, required }: CountrySelectProps) => {
  const handleChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      onChange(country.name, country.dial_code);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.name === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="country-select">Pays *</Label>
      <Select 
        value={selectedCountry?.code || ""} 
        onValueChange={handleChange}
        required={required}
      >
        <SelectTrigger id="country-select" className="w-full">
          <SelectValue placeholder="Sélectionnez un pays">
            {selectedCountry && (
              <span className="flex items-center gap-2">
                <span className="text-xl">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-[300px]">
          <SelectGroup>
            {COUNTRIES.map((country) => (
              <SelectItem 
                key={country.code} 
                value={country.code}
                className="cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{country.name}</span>
                    <span className="text-xs text-muted-foreground">{country.dial_code}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
