import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertCircle, Shield, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
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
            <CardTitle className="text-3xl">Questions Fréquentes (FAQ)</CardTitle>
            <p className="text-muted-foreground">Tout ce que vous devez savoir sur KiloFly</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Section Modération */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Politique de Modération</h2>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Quelle est la politique de tolérance zéro de KiloFly ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      KiloFly applique une <strong>politique de tolérance zéro</strong> concernant :
                    </p>
                    <ul>
                      <li>Le contenu inapproprié, offensant ou illégal</li>
                      <li>Les comportements abusifs envers d'autres utilisateurs</li>
                      <li>Toute violation des règles de la communauté</li>
                    </ul>
                    <p className="font-semibold text-destructive">
                      Tout contenu signalé sera examiné et supprimé dans un délai de 24 heures maximum. 
                      L'utilisateur responsable du contenu inapproprié sera immédiatement banni de la plateforme.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Comment signaler un contenu inapproprié ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>Vous pouvez signaler du contenu inapproprié de plusieurs façons :</p>
                    <ol>
                      <li>
                        <strong>Signaler un utilisateur</strong> : Cliquez sur le bouton "Signaler" sur le profil 
                        de l'utilisateur ou dans une conversation
                      </li>
                      <li>
                        <strong>Signaler une annonce</strong> : Utilisez le bouton de signalement sur la page 
                        de l'annonce
                      </li>
                      <li>
                        <strong>Signaler un message</strong> : Dans une conversation, utilisez les options de 
                        signalement disponibles
                      </li>
                    </ol>
                    <p>
                      Chaque signalement est <strong>examiné par notre équipe de modération dans les 24 heures</strong>.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Que se passe-t-il après un signalement ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>Après réception de votre signalement :</p>
                    <ol>
                      <li>Notre équipe examine le contenu signalé sous 24 heures</li>
                      <li>Si le contenu viole nos règles, il est immédiatement supprimé</li>
                      <li>L'utilisateur responsable reçoit un avertissement ou est banni selon la gravité</li>
                      <li>Vous recevez une notification vous informant de la décision</li>
                    </ol>
                    <p className="text-muted-foreground text-sm">
                      Nous prenons tous les signalements au sérieux et agissons rapidement pour maintenir 
                      une communauté sûre et respectueuse.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>Puis-je bloquer un utilisateur ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      Oui ! Vous pouvez bloquer n'importe quel utilisateur en utilisant le bouton "Bloquer" 
                      disponible sur leur profil ou dans les conversations.
                    </p>
                    <p>Lorsque vous bloquez un utilisateur :</p>
                    <ul>
                      <li>Il ne pourra plus vous contacter</li>
                      <li>Il ne verra plus vos annonces</li>
                      <li>Vous ne verrez plus ses annonces</li>
                      <li>Toutes les conversations existantes seront masquées</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez débloquer un utilisateur à tout moment depuis vos paramètres de confidentialité.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>Quels types de contenu sont interdits ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>Les contenus suivants sont strictement interdits sur KiloFly :</p>
                    <ul>
                      <li>Contenu violent, haineux ou discriminatoire</li>
                      <li>Harcèlement ou intimidation</li>
                      <li>Spam ou contenu trompeur</li>
                      <li>Contenu sexuellement explicite</li>
                      <li>Promotion d'activités illégales</li>
                      <li>Usurpation d'identité</li>
                      <li>Violation de la vie privée d'autrui</li>
                      <li>Contenu protégé par des droits d'auteur sans autorisation</li>
                    </ul>
                    <p className="font-semibold text-destructive">
                      La publication de tel contenu entraîne un bannissement immédiat et peut faire l'objet 
                      de poursuites légales.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Section Générale */}
            <div className="space-y-4 mt-8">
              <h2 className="text-2xl font-bold">Questions Générales</h2>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="general-1">
                  <AccordionTrigger>Comment fonctionne KiloFly ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      KiloFly met en relation des voyageurs ayant de l'espace disponible dans leurs bagages 
                      avec des personnes souhaitant envoyer des colis. Les voyageurs publient leurs trajets 
                      et les expéditeurs peuvent réserver de l'espace pour leurs envois.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-2">
                  <AccordionTrigger>La vérification d'identité est-elle obligatoire ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      <strong>Oui, absolument.</strong> Tous les utilisateurs doivent soumettre une pièce 
                      d'identité valide qui sera vérifiée par notre équipe. Seuls les utilisateurs vérifiés 
                      peuvent publier des annonces et effectuer des transactions. Cette mesure garantit la 
                      sécurité et la confiance au sein de notre communauté.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-3">
                  <AccordionTrigger>Quels sont les frais de service ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      KiloFly prélève une commission de <strong>5% sur toutes les transactions</strong>. 
                      Les tarifs de transport sont librement fixés entre voyageurs et expéditeurs.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-4">
                  <AccordionTrigger>Comment puis-je contacter le support ?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert">
                    <p>
                      Vous pouvez nous contacter à <strong>support@kilofly.com</strong> pour toute question 
                      ou problème. Notre équipe répond généralement sous 24-48 heures.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Section Contact Support */}
            <div className="bg-muted/50 border rounded-lg p-6 mt-8">
              <h3 className="font-semibold text-lg mb-2">Besoin d'aide supplémentaire ?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Si vous ne trouvez pas la réponse à votre question, notre équipe de support est là pour vous aider.
              </p>
              <Button onClick={() => window.location.href = 'mailto:support@kilofly.com'}>
                Contacter le Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
