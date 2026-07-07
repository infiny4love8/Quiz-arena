export const winnerMessages = [
  "Tu as dominé cette table du début à la fin. Victoire méritée.",
  "Performance solide. Tu remportes le tournoi et la récompense principale.",
  "Tu as gardé ton calme sous pression. Le gros lot est pour toi.",
  "Première place validée. Les autres devront revenir plus forts.",
  "Tu as joué comme un vrai champion. Ta récompense a été créditée.",
  "Belle maîtrise. Tu repars avec la meilleure part de la cagnotte.",
  "Tu as pris la tête du classement et tu l’as gardée. Respect.",
  "Victoire propre. Ton score a parlé pour toi.",
  "Tu viens de prouver que tu avais ta place au sommet.",
  "Tournoi remporté. Les gains sont à toi, champion.",
];

export const secondMessages = [
  "Tu étais tout près de la première place. Magnifique performance.",
  "Deuxième place validée. Tu repars avec un ticket sponsorisé.",
  "Très belle partie. Le prochain tournoi peut clairement être le tien.",
  "Tu fais partie des meilleurs de cette table. Continue comme ça.",
  "Solide jusqu’au bout. Ton ticket sponsorisé t’attend.",
  "Tu as manqué la première place de peu, mais tu gagnes quand même.",
  "Très bon score. Tu peux utiliser ton ticket pour tenter un tournoi gratuit.",
  "Belle résistance. Tu es passé tout près du gros lot.",
  "Deuxième place méritée. Le prochain coup peut être le bon.",
  "Tu as montré un vrai niveau. Reviens chercher la première place.",
];

export const loserMessages = [
  "Bien joué. Tu n’étais pas loin des récompenses cette fois-ci.",
  "Chaque tournoi te rend plus fort. Reviens plus préparé.",
  "Bonne tentative. Ton cashback a été ajouté pour te relancer.",
  "Ce n’est pas fini. Les meilleurs joueurs progressent en rejouant.",
  "Tu as gagné de l’expérience, même sans finir dans les récompenses.",
  "Tu peux revenir plus fort au prochain tournoi.",
  "Tu as tenté ta chance avec courage. Le prochain score peut tout changer.",
  "Encore un peu d’entraînement et tu peux viser le Top 2.",
  "Ce round t’a préparé pour le prochain. Ne lâche pas.",
  "Belle participation. Ton bonus retour est là pour t’aider à repartir.",
];

export const cancelledMessages = [
  "Le tournoi a été annulé car le minimum de joueurs n’a pas été atteint.",
  "La table n’a pas réuni assez de participants. Tes coins ont été remboursés.",
  "Tournoi annulé sans perte. Ta mise est revenue sur ton compte.",
  "Pas assez de joueurs cette fois-ci. Tu peux rejoindre une autre table.",
  "La partie n’a pas pu démarrer. Remboursement automatique effectué.",
  "Aucune inquiétude : tes coins ont été restaurés.",
  "Table fermée faute de participants. Ton solde a été corrigé.",
  "Le tournoi est annulé, mais ta mise est protégée.",
  "Le minimum de joueurs n’a pas été atteint. Remboursement confirmé.",
  "Tu n’as rien perdu. Rejoins un autre tournoi quand tu veux.",
];

export const pendingMessages = [
  "Ton score est enregistré. Le classement peut encore évoluer.",
  "Belle partie. Attends la fin du tournoi pour connaître ton rang final.",
  "Ton score est dans la table. Les autres joueurs jouent encore.",
  "Résultat provisoire enregistré. Reste prêt pour la fin du chrono.",
  "Tu as fait ta part. Le classement final arrive bientôt.",
  "Le tournoi est encore ouvert. Ton rang peut bouger jusqu’à la fin.",
  "Score validé. Reviens dans quelques minutes pour voir les gagnants.",
  "Ton résultat est sécurisé. Le classement final sera bientôt disponible.",
  "Tu es officiellement dans la course. Attends la fermeture de la table.",
  "Le suspense continue. Le classement final arrive à la fin du tournoi.",
];

export const topThreeMessages = [
  "Tu fais partie des meilleurs joueurs de ce tournoi.",
  "Top 3 validé. Très belle performance.",
  "Tu as accroché le haut du classement.",
  "Ta place dans le Top 3 montre ton niveau.",
  "Tu as été solide du début à la fin.",
  "Belle performance, tu restes parmi les meilleurs.",
  "Tu as prouvé que tu pouvais rivaliser avec les meilleurs.",
  "Top 3 mérité. Continue sur cette lancée.",
  "Tu es passé très près des grosses récompenses.",
  "Tu as marqué ta présence dans ce tournoi.",
];

export function pickRandomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}