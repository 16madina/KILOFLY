import { AlertTriangle, ArrowLeft, Bomb, Syringe, Skull, Package, Flame, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ProhibitedItems() {
  const navigate = useNavigate();

  const prohibitedCategories = [
    {
      icon: <Bomb className="w-8 h-8" />,
      title: "Explosifs et matières inflammables",
      items: ["Feux d'artifice", "Munitions", "Essence", "Gaz comprimé", "Allumettes"],
    },
    {
      icon: <Syringe className="w-8 h-8" />,
      title: "Drogues et substances illicites",
      items: ["Stupéfiants", "Substances psychotropes", "Médicaments non prescrits"],
    },
    {
      icon: <Skull className="w-8 h-8" />,
      title: "Armes et objets dangereux",
      items: ["Armes à feu", "Couteaux", "Armes blanches", "Tasers", "Matraques"],
    },
    {
      icon: <Flame className="w-8 h-8" />,
      title: "Produits chimiques dangereux",
      items: ["Acides", "Produits corrosifs", "Pesticides", "Mercure", "Amiante"],
    },
    {
      icon: <Radio className="w-8 h-8" />,
      title: "Matières radioactives",
      items: ["Sources radioactives", "Déchets nucléaires", "Isotopes"],
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: "Contrefaçons et biens illégaux",
      items: ["Produits contrefaits", "Espèces protégées", "Organes humains", "Documents falsifiés"],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 p-6 pb-8">
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
            <h1 className="text-2xl font-bold mb-2">Articles Interdits</h1>
            <p className="text-muted-foreground">
              Il est strictement interdit de transporter les articles suivants. Tout contrevenant s'expose à des poursuites judiciaires.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {prohibitedCategories.map((category, index) => (
          <Card key={index} className="border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="text-destructive">{category.icon}</div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {category.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">⚖️ Responsabilité légale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              En utilisant KiloFly, vous vous engagez à ne transporter aucun des articles interdits mentionnés ci-dessus.
            </p>
            <p className="font-semibold text-destructive">
              Le transport d'articles interdits peut entraîner :
            </p>
            <ul className="space-y-1 ml-4">
              <li>• Des poursuites pénales</li>
              <li>• La suspension définitive de votre compte</li>
              <li>• Des amendes importantes</li>
              <li>• Des peines de prison selon la législation en vigueur</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
