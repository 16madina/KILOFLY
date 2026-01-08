import { AlertTriangle, ArrowLeft, Bomb, Syringe, Skull, Package, Flame, Radio, Plane, ShieldCheck, Scale, FileWarning, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { isMobile } from "@/lib/platform";

export default function AirportRegulations() {
  const navigate = useNavigate();

  const openExternalLink = async (url: string) => {
    if (isMobile()) {
      // On native, use Capacitor Browser plugin dynamically
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url });
      } catch {
        window.open(url, "_blank");
      }
    } else {
      window.open(url, "_blank");
    }
  };

  // Réglementations IATA/TSA - Articles strictement interdits
  const iataProhibitedCategories = [
    {
      icon: <Bomb className="w-6 h-6" />,
      title: "Explosifs et munitions",
      severity: "critical",
      items: [
        "Munitions et cartouches",
        "Détonateurs et mèches",
        "Grenades et mines",
        "Feux d'artifice et pétards",
        "Répliques d'explosifs",
        "Dynamite et TNT",
        "Poudre à canon",
      ],
    },
    {
      icon: <Flame className="w-6 h-6" />,
      title: "Matières inflammables",
      severity: "critical",
      items: [
        "Essence et carburants",
        "Gaz comprimés (butane, propane)",
        "Allumettes de sûreté (max 1 boîte sur soi)",
        "Briquets tempête",
        "Peintures et diluants",
        "Alcool >70% volume",
        "Sprays inflammables",
      ],
    },
    {
      icon: <Skull className="w-6 h-6" />,
      title: "Substances toxiques et corrosives",
      severity: "critical",
      items: [
        "Acides et bases concentrés",
        "Eau de javel concentrée",
        "Mercure et composés mercuriels",
        "Pesticides et insecticides",
        "Poisons et venins",
        "Agents pathogènes",
        "Amiante",
      ],
    },
    {
      icon: <Syringe className="w-6 h-6" />,
      title: "Drogues et substances contrôlées",
      severity: "critical",
      items: [
        "Stupéfiants (cannabis, cocaïne, héroïne, etc.)",
        "Substances psychotropes non prescrites",
        "Stéroïdes anabolisants",
        "GHB et substances apparentées",
        "Champignons hallucinogènes",
        "Précurseurs chimiques",
      ],
    },
    {
      icon: <Radio className="w-6 h-6" />,
      title: "Matières radioactives",
      severity: "critical",
      items: [
        "Sources radioactives",
        "Isotopes radioactifs",
        "Déchets nucléaires",
        "Matériel irradié",
      ],
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Armes et objets dangereux",
      severity: "high",
      items: [
        "Armes à feu (toutes catégories)",
        "Armes blanches (couteaux >6cm, épées, machettes)",
        "Tasers et pistolets électriques",
        "Matraques et tonfa",
        "Sprays au poivre / lacrymogènes",
        "Arts martiaux (nunchaku, shurikens, etc.)",
        "Battes et clubs",
        "Rasoirs et cutters",
      ],
    },
  ];

  // Restrictions en cabine (liquides, gels, aérosols)
  const cabinRestrictions = [
    {
      title: "Règle des 100ml en cabine",
      description: "Tous les liquides, gels, crèmes et aérosols doivent être dans des contenants de 100ml maximum, placés dans un sac plastique transparent refermable de 1L.",
      items: [
        "Boissons et eaux",
        "Parfums et eaux de toilette",
        "Crèmes et lotions",
        "Gels (douche, cheveux)",
        "Déodorants et sprays",
        "Mascara et maquillage liquide",
        "Dentifrices",
        "Soupes et sauces",
      ],
    },
  ];

  // Articles à déclarer
  const itemsToDeclareTodeclare = [
    {
      title: "Articles à déclarer en douane",
      items: [
        "Sommes d'argent >10 000€",
        "Bijoux et objets de valeur",
        "Appareils électroniques professionnels",
        "Marchandises commerciales",
        "Tabac au-delà des franchises (200 cigarettes UE)",
        "Alcool au-delà des franchises (1L spiritueux)",
        "Produits alimentaires d'origine animale",
        "Médicaments avec ordonnance",
      ],
    },
  ];

  // Produits interdits selon les pays
  const countrySpecificBans = [
    { country: "🇫🇷 France / UE", items: ["Viandes et produits laitiers hors UE", "Contrefaçons", "CBD avec THC >0.3%"] },
    { country: "🇺🇸 USA", items: ["Fromages au lait cru", "Kinder Surprise", "Absinthe traditionnelle", "Viandes non certifiées USDA"] },
    { country: "🇨🇮 Côte d'Ivoire", items: ["Certains médicaments sans visa d'importation", "Devises non déclarées"] },
    { country: "🇸🇳 Sénégal", items: ["Alcool (restrictions)", "Produits à base de porc", "Contrefaçons"] },
    { country: "🇨🇦 Canada", items: ["Produits laitiers et viandes", "Fruits et légumes frais", "Armes prohibées"] },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 p-6 pb-8 pt-safe">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Réglementations Aéroportuaires</h1>
            <p className="text-muted-foreground">
              Guide complet des articles interdits selon les normes IATA et TSA
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-4">
        {/* Badges officiels */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <Plane className="h-3 w-3" /> IATA
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> TSA
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Scale className="h-3 w-3" /> Douanes
          </Badge>
        </div>

        {/* Section IATA/TSA - Articles strictement interdits */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <FileWarning className="h-5 w-5" />
            Articles strictement interdits (Cabine & Soute)
          </h2>
          
          {iataProhibitedCategories.map((category, index) => (
            <Card key={index} className={`border-destructive/20 ${category.severity === 'critical' ? 'bg-red-500/5' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.severity === 'critical' ? 'bg-red-500/10 text-red-600' : 'bg-orange-500/10 text-orange-600'}`}>
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{category.title}</CardTitle>
                    {category.severity === 'critical' && (
                      <Badge variant="destructive" className="mt-1 text-xs">Interdit absolu</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Restrictions cabine - Liquides */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-orange-600">
            <Package className="h-5 w-5" />
            Restrictions en cabine (Règle 3-1-1)
          </h2>
          
          {cabinRestrictions.map((restriction, index) => (
            <Card key={index} className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-base">{restriction.title}</CardTitle>
                <CardDescription>{restriction.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {restriction.items.map((item, i) => (
                    <Badge key={i} variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-300">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Articles à déclarer */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
            <Scale className="h-5 w-5" />
            Articles à déclarer en douane
          </h2>
          
          {itemsToDeclareTodeclare.map((section, index) => (
            <Card key={index} className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Restrictions par pays */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Restrictions spécifiques par pays</h2>
          
          <div className="grid gap-3">
            {countrySpecificBans.map((country, index) => (
              <Card key={index} className="border-border/50">
                <CardHeader className="py-3 pb-2">
                  <CardTitle className="text-sm font-medium">{country.country}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {country.items.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Liens officiels */}
        <Card className="bg-muted/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">🔗 Ressources officielles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => openExternalLink("https://www.iata.org/en/programs/cargo/dgr/")}
              className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left"
            >
              <ExternalLink className="h-4 w-4" />
              IATA - Marchandises dangereuses
            </button>
            <button
              onClick={() => openExternalLink("https://www.tsa.gov/travel/security-screening/whatcanibring/all")}
              className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left"
            >
              <ExternalLink className="h-4 w-4" />
              TSA - What Can I Bring?
            </button>
            <button
              onClick={() => openExternalLink("https://www.douane.gouv.fr/fiche/voyageurs-vos-franchises")}
              className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left"
            >
              <ExternalLink className="h-4 w-4" />
              Douanes françaises - Franchises voyageurs
            </button>
          </CardContent>
        </Card>

        {/* Responsabilité légale */}
        <Card className="bg-destructive/5 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-destructive" />
              Responsabilité légale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              En utilisant KiloFly, vous vous engagez à ne transporter aucun des articles interdits mentionnés ci-dessus.
            </p>
            <p className="font-semibold text-destructive">
              Le transport d'articles interdits peut entraîner :
            </p>
            <ul className="space-y-1 ml-4">
              <li>• Des poursuites pénales dans le pays de départ et/ou d'arrivée</li>
              <li>• La confiscation des marchandises</li>
              <li>• Des amendes pouvant atteindre plusieurs milliers d'euros</li>
              <li>• Des peines d'emprisonnement selon la législation en vigueur</li>
              <li>• La suspension définitive de votre compte KiloFly</li>
              <li>• L'interdiction de voyager dans certains pays</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Cette liste n'est pas exhaustive. Il est de votre responsabilité de vérifier les réglementations spécifiques à votre compagnie aérienne et pays de destination.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}