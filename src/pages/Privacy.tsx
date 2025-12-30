import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-4xl px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mb-4 rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Politique de Confidentialité</CardTitle>
            <p className="text-muted-foreground">Conformité internationale — RGPD, LPRPDE et lois locales applicables</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-xl font-semibold border-b pb-2">1. Données Collectées</h2>
              <p>KiloFly collecte les données suivantes dans le cadre de la fourniture du service :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Données d'identification</strong> : nom, email, numéro de téléphone</li>
                <li><strong>Données de compte et d'utilisation</strong> : informations de profil, historique d'activité</li>
                <li><strong>Données de paiement</strong> : traitées par des prestataires sécurisés (Stripe)</li>
                <li><strong>Données de vérification</strong> : document d'identité, selfie (si vérification activée)</li>
                <li><strong>Données techniques et de sécurité</strong> : adresse IP, données de connexion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">2. Finalités du Traitement</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Fourniture du service de mise en relation</li>
                <li>Sécurité et prévention de la fraude</li>
                <li>Gestion des transactions et paiements</li>
                <li>Amélioration continue de la plateforme</li>
                <li>Respect des obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">3. Conformité Internationale</h2>
              <p>
                KiloFly applique des standards élevés de protection des données inspirés des principes du 
                <strong> RGPD européen</strong>, de la <strong>LPRPDE canadienne</strong> et des lois locales 
                applicables, quel que soit le pays de résidence de l'utilisateur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">4. Vos Droits (Monde Entier)</h2>
              <p>Vous disposez des droits suivants concernant vos données personnelles :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Droit d'accès</strong> : consulter vos données personnelles</li>
                <li><strong>Droit de rectification</strong> : corriger vos informations</li>
                <li><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
                <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">5. Sécurité et Conservation</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Mesures techniques et organisationnelles raisonnables</li>
                <li>Accès restreint aux données (personnel autorisé uniquement)</li>
                <li>Conservation limitée au strict nécessaire</li>
                <li>Chiffrement des données sensibles</li>
                <li>Stockage sécurisé des documents d'identité</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">6. Coopération avec les Autorités</h2>
              <p>
                KiloFly peut divulguer certaines données si la loi l'exige ou pour protéger 
                la plateforme, les utilisateurs ou le public.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">7. Cookies</h2>
              <p>
                Notre application utilise des cookies essentiels pour le fonctionnement de la plateforme 
                (authentification, préférences). Aucun cookie de suivi publicitaire n'est utilisé sans 
                votre consentement explicite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">8. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou vos données personnelles, 
                contactez-nous à : <strong>legal@kilofly.app</strong>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
