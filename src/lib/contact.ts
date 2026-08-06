/**
 * Coordonnées publiques et informations d'édition de Filon.
 *
 * Source UNIQUE, consommée par le pied de page marketing et les pages légales
 * (mentions, confidentialité, conditions). À faire évoluer ici quand un domaine
 * et une adresse professionnels seront en place (remplacer l'e-mail Gmail et le
 * lien GitHub personnel par `contact@<domaine>` et une page société).
 */
export const CONTACT = {
  /** Adresse de contact affichée publiquement. */
  email: 'djedjelipatrick@gmail.com',
  /** Ligne WhatsApp support. */
  whatsapp: 'https://wa.me/2250141540178',
  /** Dépôt / présence publique. */
  github: 'https://github.com/James10192',
  /** Nom de l'éditeur du service. */
  editor: 'Filon',
  /** Localisation de l'éditeur. */
  city: 'Abidjan, Côte d’Ivoire',
} as const

/**
 * Sous-traitants (processeurs) qui traitent des données pour le compte de Filon.
 * Listés dans la politique de confidentialité pour rester honnête sur le stack.
 */
export const DATA_PROCESSORS: { name: string; role: string }[] = [
  { name: 'Convex', role: 'Base de données et backend temps réel (hébergement des données du compte).' },
  { name: 'Vercel', role: 'Hébergement de l’application web.' },
  { name: 'Paystack', role: 'Traitement des paiements d’abonnement.' },
  { name: 'Resend', role: 'Envoi des e-mails transactionnels (réinitialisation de mot de passe, reçus).' },
  { name: 'PostHog', role: 'Mesure d’audience et analyse d’usage du produit.' },
  { name: 'OpenRouter', role: 'Acheminement des requêtes du copilote IA vers les modèles de langage.' },
]
