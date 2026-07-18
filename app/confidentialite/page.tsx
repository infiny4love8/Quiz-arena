import Link from "next/link";

const articles = [
  {
    title: "1. Responsable du traitement",
    body: `Le responsable du traitement est l’exploitant légal de Zonarena. Avant publication, les informations suivantes doivent être complétées : nom légal, adresse, pays d’établissement, adresse e-mail et moyen de contact du support.`,
  },
  {
    title: "2. Données collectées",
    body: `Zonarena peut collecter le nom ou pseudonyme, l’adresse e-mail, le numéro de téléphone, l’identifiant utilisateur, le numéro MonCash, l’historique des dépôts et retraits, les preuves de paiement, les scores, temps de jeu, classements, récompenses, adresses IP, informations sur l’appareil, journaux de connexion, messages au support et données nécessaires à la prévention de la fraude.`,
  },
  {
    title: "3. Finalités du traitement",
    body: `Les données sont utilisées pour créer et sécuriser les comptes, organiser les compétitions, calculer et vérifier les résultats, traiter les dépôts et retraits, prévenir la fraude, répondre au support, envoyer des notifications utiles, respecter les obligations légales et améliorer la plateforme.`,
  },
  {
    title: "4. Données liées à la sécurité",
    body: `Afin de protéger l’intégrité des compétitions, Zonarena peut comparer des signaux comme l’appareil, l’adresse IP, les comptes liés, les horaires de connexion, les scores, les temps de réponse, l’historique des transactions et les comportements inhabituels.`,
  },
  {
    title: "5. Base et nécessité du traitement",
    body: `Certaines données sont nécessaires à l’exécution du service demandé par l’utilisateur, notamment la création du compte, la participation aux compétitions et le traitement des paiements. D’autres traitements peuvent être nécessaires pour la sécurité, la prévention de la fraude, le respect d’obligations légales ou l’intérêt légitime de protéger la plateforme et ses utilisateurs.`,
  },
  {
    title: "6. Partage des données",
    body: `Les données peuvent être partagées uniquement lorsque cela est nécessaire avec des prestataires comme Supabase, Vercel, Resend, MonCash, des services de sécurité, des conseillers professionnels ou des autorités compétentes. Zonarena ne vend pas les données personnelles de ses utilisateurs.`,
  },
  {
    title: "7. Transferts et hébergement",
    body: `Les données peuvent être hébergées ou traitées dans des pays différents du pays de résidence de l’utilisateur, selon l’infrastructure des prestataires utilisés. Zonarena sélectionne des prestataires offrant des garanties raisonnables de sécurité.`,
  },
  {
    title: "8. Conservation",
    body: `Les données sont conservées pendant la durée nécessaire à la fourniture du service, à la sécurité, à la prévention de la fraude, au traitement des réclamations et au respect des obligations légales. Les preuves de paiement et journaux de sécurité ne sont pas conservés indéfiniment sans justification.`,
  },
  {
    title: "9. Sécurité",
    body: `Zonarena met en œuvre des mesures raisonnables telles que HTTPS, authentification, politiques RLS Supabase, validation côté serveur, contrôle des accès administratifs, stockage privé des preuves, liens temporaires, limitation des requêtes, journaux d’audit et séparation des clés publiques et privées.`,
  },
  {
    title: "10. Preuves de paiement",
    body: `Les captures MonCash et autres justificatifs peuvent contenir des informations sensibles. Elles doivent être stockées dans un espace privé et accessibles uniquement aux personnes autorisées pendant la durée nécessaire à leur vérification.`,
  },
  {
    title: "11. Droits des utilisateurs",
    body: `Selon la législation applicable, l’utilisateur peut demander l’accès, la correction, la mise à jour ou la suppression de ses données, ainsi que la fermeture de son compte. Certaines informations peuvent être conservées lorsque cela est nécessaire pour respecter une obligation légale, prévenir une fraude ou défendre un droit.`,
  },
  {
    title: "12. Décisions automatisées",
    body: `Les systèmes antifraude peuvent signaler automatiquement une activité inhabituelle. Une mesure importante, comme la fermeture définitive d’un compte ou l’annulation d’un gain légitime, devrait pouvoir faire l’objet d’une vérification humaine.`,
  },
  {
    title: "13. Cookies et stockage local",
    body: `Zonarena peut utiliser des cookies ou mécanismes similaires pour maintenir les sessions, sécuriser les connexions, mémoriser certaines préférences, détecter les abus et analyser les erreurs techniques.`,
  },
  {
    title: "14. Mineurs",
    body: `Zonarena est réservée aux personnes âgées d’au moins 18 ans, sauf disposition légale ou règle particulière clairement indiquée. La plateforme ne cherche pas à collecter volontairement les données de mineurs non autorisés.`,
  },
  {
    title: "15. Violation de données",
    body: `En cas d’accès non autorisé ou de fuite présentant un risque, Zonarena prendra des mesures raisonnables pour contenir l’incident, sécuriser les comptes, analyser les données concernées et informer les utilisateurs ou autorités lorsque la loi l’exige.`,
  },
  {
    title: "16. Modification de la politique",
    body: `La présente politique peut être mise à jour. La date et le numéro de version sont affichés en haut de la page. En cas de modification importante, les utilisateurs peuvent être invités à accepter la nouvelle version.`,
  },
  {
    title: "17. Contact et réclamations",
    body: `Toute demande relative aux données personnelles doit être envoyée au contact officiel indiqué sur cette page. La demande doit permettre d’identifier le compte concerné sans exiger plus d’informations que nécessaire.`,
  },
];

export default function ConfidentialitePage() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>ZONARENA • PROTECTION DES DONNÉES</div>
        <h1 style={styles.title}>Politique de confidentialité</h1>
        <p style={styles.lead}>
          Cette politique explique quelles données sont collectées, pourquoi elles
          sont utilisées, comment elles sont protégées et quels droits possèdent les utilisateurs.
        </p>
        <div style={styles.meta}>Version 1.0 • Dernière mise à jour : 18 juillet 2026</div>
      </section>

      

      <nav style={styles.nav}>
        <Link href="/conditions" style={styles.link}>
          Lire les Conditions d’utilisation →
        </Link>
      </nav>

      <section style={styles.content}>
        {articles.map((article) => (
          <article key={article.title} style={styles.card}>
            <h2 style={styles.articleTitle}>{article.title}</h2>
            <p style={styles.text}>{article.body}</p>
          </article>
        ))}
      </section>

      <section style={styles.contact}>
        <h2 style={styles.articleTitle}>Contact confidentialité</h2>
        <p style={styles.text}>
         
          E-mail : <strong>zonarena41@gmail.com</strong><br />
          
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#08090d",
    color: "#f5f2e9",
    padding: "28px 16px 64px",
    fontFamily: "Inter, Arial, sans-serif",
  },
  hero: {
    maxWidth: 920,
    margin: "0 auto 24px",
    padding: "36px 28px",
    borderRadius: 22,
    background: "linear-gradient(145deg, #15120b 0%, #0f1118 65%)",
    border: "1px solid #3b2f12",
  },
  badge: {
    color: "#d6a93b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
    marginBottom: 14,
  },
  title: {
    margin: 0,
    fontSize: "clamp(30px, 6vw, 54px)",
    lineHeight: 1.05,
  },
  lead: {
    color: "#b8b4aa",
    lineHeight: 1.7,
    maxWidth: 700,
    margin: "18px 0 12px",
  },
  meta: { color: "#746f65", fontSize: 13 },
  notice: {
    maxWidth: 920,
    margin: "0 auto 18px",
    padding: 16,
    borderRadius: 14,
    background: "#251a08",
    border: "1px solid #6f4c0c",
    color: "#f2cf7b",
    lineHeight: 1.6,
  },
  nav: { maxWidth: 920, margin: "0 auto 18px" },
  link: { color: "#e1b94f", textDecoration: "none", fontWeight: 700 },
  content: {
    maxWidth: 920,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },
  card: {
    padding: "22px 20px",
    borderRadius: 16,
    background: "#10121a",
    border: "1px solid #202330",
  },
  articleTitle: { margin: "0 0 10px", fontSize: 18, color: "#f1c75b" },
  text: { margin: 0, color: "#bbb8b0", lineHeight: 1.75, fontSize: 15 },
  contact: {
    maxWidth: 920,
    margin: "20px auto 0",
    padding: "22px 20px",
    borderRadius: 16,
    background: "#10121a",
    border: "1px solid #202330",
  },
};
