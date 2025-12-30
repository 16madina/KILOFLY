import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertTriangle, Shield, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
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
            <CardTitle className="text-3xl">Conditions d'Utilisation</CardTitle>
            <p className="text-muted-foreground">Portée mondiale — Document juridique final</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            {/* CLAUSE CLÉ DE PROTECTION */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 not-prose">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Nature du Service (Clause clé)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                KiloFly est une plateforme numérique de mise en relation entre utilisateurs. 
                <strong> KiloFly n'est pas un transporteur</strong>, n'est pas un intermédiaire de transport, 
                ne prend jamais possession des colis, ne les emballe pas, ne les stocke pas, 
                ne les inspecte pas physiquement et n'intervient pas dans leur acheminement.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tous les transports, échanges et remises de colis sont effectués exclusivement sous la 
                responsabilité des utilisateurs (expéditeur et voyageur). KiloFly fournit uniquement un 
                outil technologique facilitant la mise en relation.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">1. Responsabilité Exclusive des Utilisateurs</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>L'expéditeur</strong> est seul responsable du contenu, de la légalité et de la conformité du colis.</li>
                <li><strong>Le voyageur</strong> est seul responsable de ce qu'il accepte de transporter.</li>
                <li><strong>Chaque utilisateur</strong> est responsable du respect des lois douanières, pénales et administratives des pays de départ, de transit et d'arrivée.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                2. Objets Strictement Interdits
              </h2>
              <p className="text-destructive font-medium">Responsabilité pénale de l'utilisateur :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Drogues, stupéfiants, substances illégales</li>
                <li>Armes, munitions, explosifs, objets dangereux</li>
                <li>Médicaments non autorisés ou soumis à prescription</li>
                <li>Documents officiels (passeport, carte d'identité, titres de séjour)</li>
                <li>Argent liquide, métaux précieux, bijoux de grande valeur</li>
                <li>Produits contrefaits ou illégaux</li>
                <li>Tout objet interdit par la loi ou les autorités douanières</li>
              </ul>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Toute violation entraîne la suspension immédiate du compte, le blocage des fonds 
                  et peut faire l'objet d'un signalement aux autorités compétentes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">3. Limitation Maximale de Responsabilité</h2>
              <p>
                KiloFly ne saurait être tenue responsable, directement ou indirectement, de tout dommage, 
                perte, vol, saisie, retard, sanction, poursuite ou conséquence liée :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Au contenu d'un colis</li>
                <li>Au transport lui-même</li>
                <li>Aux décisions des autorités douanières ou aéroportuaires</li>
                <li>Aux transactions entre utilisateurs</li>
                <li>Aux conflits entre utilisateurs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">4. Conditions d'Inscription</h2>
              <p>Pour utiliser KiloFly, vous devez :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Avoir au moins 18 ans</li>
                <li>Fournir des informations exactes et à jour</li>
                <li>Soumettre une photo de profil récente</li>
                <li>Vérifier votre identité avec une pièce d'identité valide</li>
                <li>Accepter la politique de confidentialité</li>
                <li>Maintenir la confidentialité de votre compte</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">5. Suspension, Blocage et Suppression</h2>
              <p>KiloFly se réserve le droit de :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Suspendre ou supprimer un compte sans préavis</li>
                <li>Bloquer ou geler un paiement</li>
                <li>Refuser l'accès à la plateforme</li>
              </ul>
              <p className="mt-2">
                Ces mesures peuvent être appliquées en cas de fraude, risque, non-respect des règles 
                ou menace pour la sécurité de la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">6. Politique de Tolérance Zéro</h2>
              <p>KiloFly applique une politique de tolérance zéro concernant :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Le contenu inapproprié, offensant ou illégal</li>
                <li>Les comportements abusifs envers d'autres utilisateurs</li>
                <li>Toute violation des règles de la communauté</li>
              </ul>
              <p className="mt-2 font-medium">
                Tout contenu signalé sera examiné et supprimé dans un délai de 24 heures maximum. 
                L'utilisateur responsable sera immédiatement banni de la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">7. Paiements et Commission</h2>
              <p>
                Les tarifs sont librement fixés entre voyageurs et expéditeurs. 
                KiloFly prélève une commission de 5% sur toutes les transactions. 
                Les paiements sont traités par des prestataires sécurisés.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">8. Clause App Store / Google Play</h2>
              <p>
                KiloFly est une application indépendante. <strong>Apple Inc.</strong> et <strong>Google LLC</strong> ne 
                sont ni éditeurs, ni sponsors, ni responsables du service. Toute réclamation relative à 
                KiloFly doit être adressée exclusivement à l'éditeur de l'application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
                <Scale className="h-5 w-5" />
                9. Droit Applicable et Juridiction
              </h2>
              <p>
                Les présentes conditions sont régies par les principes généraux du droit international privé. 
                En cas de litige, l'éditeur se réserve le droit de déterminer la juridiction compétente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold border-b pb-2">10. Contact Légal</h2>
              <p>
                Pour toute question concernant ces conditions d'utilisation, contactez-nous à : 
                <strong> legal@kilofly.app</strong>
              </p>
            </section>

            <div className="bg-muted/50 border rounded-lg p-4 mt-8 not-prose">
              <p className="font-semibold mb-2">📋 Rappel Important</p>
              <p className="text-sm text-muted-foreground">
                En utilisant KiloFly, vous reconnaissez avoir lu, compris et accepté l'intégralité de ces 
                conditions d'utilisation. Vous êtes responsable de vous assurer que votre utilisation de 
                la plateforme est conforme aux lois de votre pays, des pays de transit et du pays de destination.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
