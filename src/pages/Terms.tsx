import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
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
            <p className="text-muted-foreground">Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Acceptation des Conditions</h2>
            <p>
              En utilisant KiloFly, vous acceptez d'être lié par ces conditions d'utilisation. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.
            </p>

            <h2>2. Description du Service</h2>
            <p>
              KiloFly est une plateforme de mise en relation entre :
            </p>
            <ul>
              <li><strong>Voyageurs</strong> : personnes disposant d'espace bagages disponible lors de leurs voyages</li>
              <li><strong>Expéditeurs</strong> : personnes souhaitant envoyer des colis via des voyageurs</li>
            </ul>
            <p>
              KiloFly agit uniquement comme intermédiaire et n'est pas responsable des transactions 
              entre utilisateurs.
            </p>

            <h2>3. Conditions d'Inscription</h2>
            <p>Pour utiliser KiloFly, vous devez :</p>
            <ul>
              <li>Avoir au moins 18 ans</li>
              <li>Fournir des informations exactes et à jour</li>
              <li>Soumettre une photo de profil récente</li>
              <li>Vérifier votre identité avec une pièce d'identité valide</li>
              <li>Accepter la politique de confidentialité</li>
              <li>Maintenir la confidentialité de votre compte</li>
            </ul>

            <h2>4. Vérification d'Identité</h2>
            <p>
              <strong>OBLIGATOIRE</strong> : Tous les utilisateurs doivent soumettre un document d'identité 
              valide (carte d'identité ou passeport) pour être vérifiés par notre équipe. 
              Seuls les utilisateurs vérifiés peuvent publier des annonces et effectuer des transactions.
            </p>

            <h2>5. Responsabilités des Voyageurs</h2>
            <p>En tant que voyageur, vous vous engagez à :</p>
            <ul>
              <li>Vérifier le contenu des colis que vous transportez</li>
              <li>Refuser tout article illégal, dangereux ou interdit</li>
              <li>Respecter les réglementations douanières et aéroportuaires</li>
              <li>Assurer la sécurité et l'intégrité des colis transportés</li>
              <li>Informer l'expéditeur en cas de retard ou problème</li>
              <li>Ne transporter que des articles légaux et autorisés</li>
            </ul>

            <h2>6. Responsabilités des Expéditeurs</h2>
            <p>En tant qu'expéditeur, vous vous engagez à :</p>
            <ul>
              <li>Déclarer honnêtement le contenu de vos colis</li>
              <li>N'envoyer que des articles légaux et autorisés</li>
              <li>Emballer correctement vos colis</li>
              <li>Respecter les limites de poids convenues</li>
              <li>Communiquer clairement avec le voyageur</li>
              <li>Ne pas inclure d'articles dangereux ou interdits</li>
            </ul>

            <h2>7. Articles Interdits</h2>
            <p><strong>Il est strictement interdit de transporter :</strong></p>
            <ul>
              <li>Drogues et substances illégales</li>
              <li>Armes et munitions</li>
              <li>Matières explosives ou inflammables</li>
              <li>Produits dangereux ou toxiques</li>
              <li>Argent liquide en grande quantité non déclaré</li>
              <li>Articles contrefaits</li>
              <li>Animaux vivants (sauf exceptions légales)</li>
              <li>Tout article illégal ou soumis à restrictions</li>
            </ul>

            <h2>8. Sécurité et Fraude</h2>
            <p>
              Nous prenons la sécurité très au sérieux. Tout comportement frauduleux, 
              tentative d'escroquerie ou violation des lois entraînera :
            </p>
            <ul>
              <li>La suspension immédiate du compte</li>
              <li>Le signalement aux autorités compétentes</li>
              <li>D'éventuelles poursuites judiciaires</li>
            </ul>

            <h2>9. Paiements et Tarifs</h2>
            <p>
              Les tarifs sont librement fixés entre voyageurs et expéditeurs. 
              KiloFly prélève une commission de 5% sur toutes les transactions. 
              Les utilisateurs sont responsables de leurs arrangements financiers.
            </p>

            <h2>10. Limitation de Responsabilité</h2>
            <p>
              KiloFly n'est pas responsable de :
            </p>
            <ul>
              <li>La perte, le vol ou les dommages des colis</li>
              <li>Les retards ou annulations de voyage</li>
              <li>Les conflits entre utilisateurs</li>
              <li>Les violations douanières ou légales</li>
              <li>Les transactions financières entre utilisateurs</li>
            </ul>

            <h2>11. Propriété Intellectuelle</h2>
            <p>
              Le contenu de KiloFly (logo, design, textes) est protégé par les droits d'auteur. 
              Toute reproduction sans autorisation est interdite.
            </p>

            <h2>12. Suspension et Résiliation</h2>
            <p>
              Nous nous réservons le droit de suspendre ou résilier votre compte en cas de :
            </p>
            <ul>
              <li>Violation de ces conditions d'utilisation</li>
              <li>Activité frauduleuse ou illégale</li>
              <li>Fausses informations fournies</li>
              <li>Comportement inapproprié envers d'autres utilisateurs</li>
              <li>Non-respect des réglementations</li>
            </ul>

            <h2>13. Modifications des Conditions</h2>
            <p>
              Nous pouvons modifier ces conditions à tout moment. Les modifications importantes 
              seront notifiées aux utilisateurs. L'utilisation continue du service après 
              modification constitue une acceptation des nouvelles conditions.
            </p>

            <h2>14. Droit Applicable</h2>
            <p>
              Ces conditions sont régies par le droit français. Tout litige sera soumis 
              aux tribunaux compétents de Paris, France.
            </p>

            <h2>15. Contact</h2>
            <p>
              Pour toute question concernant ces conditions d'utilisation, contactez-nous à : 
              <strong>legal@kilofly.com</strong>
            </p>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-8">
              <p className="font-semibold text-destructive mb-2">⚠️ Important</p>
              <p className="text-sm">
                En utilisant KiloFly, vous reconnaissez avoir lu, compris et accepté 
                l'intégralité de ces conditions d'utilisation. Vous êtes responsable de 
                vous assurer que votre utilisation de la plateforme est conforme aux lois 
                de votre pays et du pays de destination.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;