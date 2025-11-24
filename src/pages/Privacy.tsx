import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Politique de Confidentialité</CardTitle>
            <p className="text-muted-foreground">Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Introduction</h2>
            <p>
              Chez KiloShare, nous nous engageons à protéger votre vie privée et vos données personnelles. 
              Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons 
              vos informations lorsque vous utilisez notre plateforme de partage de capacité de bagages.
            </p>

            <h2>2. Données Collectées</h2>
            <p>Nous collectons les informations suivantes :</p>
            <ul>
              <li><strong>Informations d'identification</strong> : nom complet, adresse e-mail, numéro de téléphone</li>
              <li><strong>Localisation</strong> : pays et ville de résidence</li>
              <li><strong>Photo de profil</strong> : pour identifier les utilisateurs</li>
              <li><strong>Document d'identité</strong> : pour vérifier votre identité (carte d'identité ou passeport)</li>
              <li><strong>Informations de voyage</strong> : dates, destinations, capacité disponible</li>
              <li><strong>Messages</strong> : communications entre utilisateurs sur la plateforme</li>
            </ul>

            <h2>3. Utilisation des Données</h2>
            <p>Nous utilisons vos données pour :</p>
            <ul>
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Vérifier votre identité pour la sécurité de tous</li>
              <li>Faciliter les transactions entre voyageurs et expéditeurs</li>
              <li>Communiquer avec vous concernant votre compte et les services</li>
              <li>Améliorer nos services et l'expérience utilisateur</li>
              <li>Prévenir la fraude et assurer la sécurité de la plateforme</li>
            </ul>

            <h2>4. Partage des Données</h2>
            <p>
              Vos données personnelles ne sont <strong>jamais vendues</strong> à des tiers. 
              Nous partageons uniquement les informations nécessaires :
            </p>
            <ul>
              <li>Avec les autres utilisateurs : nom, photo de profil, ville pour les annonces</li>
              <li>Avec nos administrateurs : pour la vérification d'identité uniquement</li>
              <li>Si requis par la loi : en réponse à des demandes légales valides</li>
            </ul>

            <h2>5. Sécurité des Données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité rigoureuses pour protéger vos données :
            </p>
            <ul>
              <li>Chiffrement des données sensibles</li>
              <li>Stockage sécurisé des documents d'identité</li>
              <li>Accès limité aux données personnelles</li>
              <li>Surveillance et audits de sécurité réguliers</li>
              <li>Authentification sécurisée des comptes</li>
            </ul>

            <h2>6. Vos Droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès</strong> : consulter vos données personnelles</li>
              <li><strong>Droit de rectification</strong> : corriger vos informations</li>
              <li><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
              <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
            </ul>

            <h2>7. Conservation des Données</h2>
            <p>
              Nous conservons vos données aussi longtemps que votre compte est actif. 
              Après la suppression de votre compte, vos données sont supprimées dans un délai de 30 jours, 
              sauf obligation légale de conservation.
            </p>

            <h2>8. Cookies</h2>
            <p>
              Notre site utilise des cookies essentiels pour le fonctionnement de la plateforme 
              (authentification, préférences). Aucun cookie de suivi publicitaire n'est utilisé.
            </p>

            <h2>9. Modifications de la Politique</h2>
            <p>
              Nous pouvons modifier cette politique de confidentialité. Les modifications importantes 
              vous seront notifiées par e-mail ou via la plateforme.
            </p>

            <h2>10. Contact</h2>
            <p>
              Pour toute question concernant cette politique de confidentialité ou vos données personnelles, 
              contactez-nous à : <strong>privacy@kiloshare.com</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;