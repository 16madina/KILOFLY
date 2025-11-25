import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plane, Package } from "lucide-react";

interface UserTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const UserTypeSelect = ({ value, onChange }: UserTypeSelectProps) => {
  return (
    <div className="space-y-3">
      <Label>Type de compte *</Label>
      <RadioGroup 
        value={value} 
        onValueChange={onChange}
        className="grid grid-cols-1 gap-3"
      >
        <div className="relative">
          <RadioGroupItem 
            value="traveler" 
            id="traveler" 
            className="peer sr-only"
          />
          <Label
            htmlFor="traveler"
            className="flex items-center gap-4 rounded-lg border-2 border-border bg-background p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plane className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Voyageur / Transporteur</div>
              <div className="text-sm text-muted-foreground">
                Je voyage et je transporte des colis
              </div>
            </div>
          </Label>
        </div>

        <div className="relative">
          <RadioGroupItem 
            value="shipper" 
            id="shipper" 
            className="peer sr-only"
          />
          <Label
            htmlFor="shipper"
            className="flex items-center gap-4 rounded-lg border-2 border-border bg-background p-4 cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Expéditeur</div>
              <div className="text-sm text-muted-foreground">
                J'envoie des colis avec des voyageurs
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
