import { useState } from "react";
import { Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PhoneVerificationProps {
  currentPhone?: string;
  isVerified?: boolean;
  onVerificationComplete?: () => void;
}

export const PhoneVerification = ({ 
  currentPhone = "", 
  isVerified = false,
  onVerificationComplete 
}: PhoneVerificationProps) => {
  const [phone, setPhone] = useState(currentPhone);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Format phone number (add country code if missing)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+1" + formattedPhone; // Default to +1 (North America)
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le code de vérification. Vérifiez votre numéro.",
        variant: "destructive",
      });
      return;
    }

    setOtpSent(true);
    toast({
      title: "Code envoyé",
      description: "Vérifiez vos SMS pour le code de vérification",
    });
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code à 6 chiffres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+1" + formattedPhone;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Erreur",
        description: "Code de vérification invalide",
        variant: "destructive",
      });
      return;
    }

    // Update profile to mark phone as verified
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ 
          phone_verified: true,
          phone: formattedPhone 
        })
        .eq("id", user.id);
    }

    setLoading(false);
    toast({
      title: "Téléphone vérifié",
      description: "Votre numéro de téléphone a été vérifié avec succès",
    });

    onVerificationComplete?.();
  };

  if (isVerified) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Téléphone vérifié</p>
              <p className="text-sm text-muted-foreground">{currentPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Vérification du téléphone
        </CardTitle>
        <CardDescription>
          Vérifiez votre numéro pour augmenter votre score de confiance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!otpSent ? (
          <>
            <div>
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Incluez l'indicatif du pays (ex: +1 pour USA/Canada)
              </p>
            </div>
            <Button onClick={handleSendOtp} disabled={loading} className="w-full">
              {loading ? "Envoi..." : "Envoyer le code de vérification"}
            </Button>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="otp">Code de vérification</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le code à 6 chiffres reçu par SMS
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerifyOtp} disabled={loading} className="flex-1">
                {loading ? "Vérification..." : "Vérifier"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setOtpSent(false)}
                disabled={loading}
              >
                Modifier le numéro
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
