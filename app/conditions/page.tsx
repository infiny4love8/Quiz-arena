import Link from "next/link";

const articles = [
  {
    title: "1. Objet de la plateforme",
    body: `Zonarena est une plateforme numérique de compétitions fondées sur l’adresse, la rapidité, la mémoire, la réflexion et les connaissances. Les résultats dépendent principalement des performances des participants. Zonarena ne constitue pas un casino, une loterie, un service de pari ni une promesse de gain garanti.`,
  },
  {
    title: "2. Acceptation des conditions",
    body: `La création d’un compte, la participation à une compétition, le dépôt de fonds, la demande de retrait ou le fait de cocher la case d’acceptation vaut acceptation expresse des présentes Conditions d’utilisation et de la Politique de confidentialité. L’utilisateur reconnaît avoir pu les consulter avant son acceptation.`,
  },
  {
    title: "3. Conditions d’admissibilité",
    body: `L’utilisateur doit fournir des informations exactes, utiliser son propre compte et un moyen de paiement qu’il est autorisé à utiliser. Zonarena est réservée aux personnes âgées d’au moins 18 ans, sauf indication légale différente expressément affichée sur la plateforme.`,
  },
  {
    title: "4. Un compte par utilisateur",
    body: `Chaque personne ne peut utiliser qu’un seul compte, sauf autorisation écrite de Zonarena. Sont interdits les comptes multiples, le partage, la vente ou le transfert de compte, l’utilisation du compte d’un tiers et la création d’un nouveau compte après suspension.`,
  },
  {
    title: "5. Fraude et comportements interdits",
    body: `Il est notamment interdit de falsifier un score, modifier ou rejouer une requête, utiliser un bot, script, macro ou outil automatisé, exploiter un bug, contourner les contrôles de sécurité, présenter une fausse preuve de paiement, coordonner plusieurs comptes, perturber une compétition ou tenter d’accéder à des données ou fonctions non autorisées.`,
  },
  {
    title: "6. Contrôles de sécurité et antifraude",
    body: `Zonarena peut analyser les scores, temps de jeu, appareils, adresses IP, historiques de connexion, transactions, comptes liés et autres signaux techniques pertinents afin de détecter les activités anormales. Ces contrôles peuvent être automatisés ou manuels.`,
  },
  {
    title: "7. Suspension, restriction et fermeture",
    body: `En présence de motifs raisonnables laissant penser à une fraude, une atteinte à la sécurité ou une violation des présentes conditions, Zonarena peut suspendre temporairement un compte, bloquer une participation, invalider un score, retenir provisoirement un retrait pendant une vérification, supprimer un bonus irrégulier ou fermer définitivement le compte.`,
  },
  {
    title: "8. Vérification des gains et retraits",
    body: `Avant tout paiement, Zonarena peut vérifier l’identité du bénéficiaire, l’historique du compte, la régularité du score, la preuve de paiement, le numéro MonCash et l’absence de comptes liés. Un retrait peut rester en attente pendant la durée raisonnablement nécessaire à cette vérification.`,
  },
  {
    title: "9. Annulation des avantages irréguliers",
    body: `Tout gain, remboursement, ticket, cashback, bonus ou récompense obtenu à la suite d’une fraude, d’une erreur technique, d’une manipulation ou d’une violation des règles peut être annulé. Les fonds légitimes non contestés restent traités conformément à la loi applicable.`,
  },
  {
    title: "10. Dépôts",
    body: `L’utilisateur doit envoyer exactement le montant indiqué et fournir une preuve authentique. Une capture d’écran ne constitue pas à elle seule une confirmation définitive. Zonarena peut vérifier directement la transaction avant de créditer le compte.`,
  },
  {
    title: "11. Retraits",
    body: `L’utilisateur est responsable de l’exactitude du numéro MonCash fourni. Des minimums, plafonds, frais ou délais peuvent s’appliquer s’ils sont affichés avant la confirmation de la demande.`,
  },
  {
    title: "12. Compétitions annulées ou interrompues",
    body: `Une compétition peut être annulée, reportée ou interrompue en cas de nombre insuffisant de participants, panne, erreur technique, fraude suspectée, force majeure ou problème affectant l’équité. Lorsqu’un tournoi payant est annulé sans faute de l’utilisateur, le droit d’entrée est normalement remboursé selon les règles affichées.`,
  },
  {
    title: "13. Absence de garantie de gain",
    body: `Aucune participation ne garantit un gain. Les récompenses dépendent du classement, des règles du tournoi, du nombre de participants, de la validation du résultat et du respect des règles. Les résultats passés ne garantissent aucun résultat futur.`,
  },
  {
    title: "14. Disponibilité du service",
    body: `Zonarena ne garantit pas un fonctionnement sans interruption. Des indisponibilités peuvent résulter d’une maintenance, d’un fournisseur tiers, d’un problème réseau, d’une panne, d’une cyberattaque ou d’un événement extérieur raisonnablement indépendant de Zonarena.`,
  },
  {
    title: "15. Limitation de responsabilité",
    body: `Dans les limites permises par la loi, Zonarena ne répond pas des dommages indirects, pertes d’opportunité, pertes de profits attendus, erreurs dues à la connexion de l’utilisateur ou à l’usage non autorisé de son compte lorsque cet usage lui est imputable. Aucune clause n’exclut une responsabilité qui ne peut légalement être exclue.`,
  },
  {
    title: "16. Responsabilité de l’utilisateur",
    body: `L’utilisateur est responsable de la confidentialité de son mot de passe, de la sécurité de son appareil, de l’exactitude des informations communiquées et du respect des lois applicables. Il doit prévenir rapidement le support en cas d’accès suspect.`,
  },
  {
    title: "17. Preuves électroniques",
    body: `Les journaux techniques, horodatages, scores côté serveur, confirmations de paiement, historiques, adresses IP et données de sécurité peuvent être utilisés comme éléments de preuve, sous réserve de la législation applicable.`,
  },
  {
    title: "18. Propriété intellectuelle",
    body: `Le nom Zonarena, son logo, ses interfaces, textes, éléments graphiques, jeux et contenus sont protégés. Toute copie, extraction, reproduction, revente, imitation trompeuse ou utilisation non autorisée est interdite.`,
  },
  {
    title: "19. Modification des services et des règles",
    body: `Zonarena peut faire évoluer ses jeux, horaires, récompenses, tarifs, fonctionnalités et moyens de paiement. Les changements importants sont communiqués de manière appropriée et ne sont pas appliqués rétroactivement de façon abusive à une compétition déjà engagée.`,
  },
  {
    title: "20. Réclamations",
    body: `Toute réclamation doit indiquer le compte concerné, la date, la compétition ou la transaction, une description précise du problème et les preuves disponibles. Zonarena s’efforcera de répondre dans un délai raisonnable.`,
  },
  {
    title: "21. Droit applicable",
    body: `Les présentes conditions sont régies par le droit du pays dans lequel l’exploitant légal de Zonarena est établi, à compléter avant publication. Cette clause ne prive pas un consommateur des protections impératives auxquelles il a droit.`,
  },
];

export default function ConditionsPage() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>ZONARENA • DOCUMENT LÉGAL</div>
        <h1 style={styles.title}>Conditions d’utilisation</h1>
        <p style={styles.lead}>
          Règles applicables aux comptes, compétitions, dépôts, retraits,
          récompenses et contrôles antifraude.
        </p>
        <div style={styles.meta}>Version 1.0 • Dernière mise à jour : 18 juillet 2026</div>
      </section>

    

      <nav style={styles.nav}>
        <Link href="/confidentialite" style={styles.link}>
          Lire la Politique de confidentialité →
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
        <h2 style={styles.articleTitle}>Contact</h2>
        <p style={styles.text}>
        
          Support : <strong>zonarena41@gmail.com</strong><br />
         
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
    maxWidth: 680,
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
