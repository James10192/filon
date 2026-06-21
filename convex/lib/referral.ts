/**
 * Regles d'affiliation Filon (parrainage produit) — source unique, pure.
 *
 * Principe de marge (decision Marcel 2026-06-21) : la recompense ne doit JAMAIS
 * faire sortir d'argent ni depasser le revenu qu'elle genere.
 *  - v1 = MOIS OFFERTS (extension de periode payee). Cout marginal quasi nul :
 *    on ne « perd » qu'un mois differe sur un compte qui paie de toute facon, et
 *    le filleul devient un abonne recurrent. Net positif des ~2 mois.
 *  - Octroye UNE seule fois par filleul, a sa 1re CONVERSION PAYANTE (jamais au
 *    simple signup → anti-spam), niveau direct uniquement (anti-pyramide).
 *  - Le CASH (commission_cash) reste NON cable : Paystack ne verse pas en XOF
 *    (devises payout : NGN/GHS/ZAR/KES/USD). Un futur versement passerait par
 *    Wave / Orange Money / virement manuel, pas par Paystack. Voir CASH_* plus bas.
 */

/** Duree d'un « mois offert », en millisecondes (30 jours). */
export const REWARD_FREE_DAYS = 30
export const REWARD_FREE_MS = REWARD_FREE_DAYS * 24 * 60 * 60 * 1000

/** Affiliation a 1 seul niveau (filleuls directs) : programme SaaS propre, pas un MLM. */
export const MAX_REFERRAL_LEVEL = 1

/**
 * Versement cash des commissions : DESACTIVE.
 * Paystack ne supporte pas les payouts en XOF (Cote d'Ivoire = encaissement seul).
 * Le schema (`referralRewards.kind: 'commission_cash'`) est pret pour un futur
 * rail (Wave/Orange Money payout ou manuel), mais rien n'est cable cote Paystack.
 */
export const CASH_PAYOUT_ENABLED = false
/** Taux indicatif d'une future commission cash (% du 1er paiement du filleul). */
export const CASH_COMMISSION_RATE = 0.2

/** Alphabet sans caracteres ambigus (pas de 0/O/1/I/L) pour un code lisible. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

/**
 * Fabrique un code de parrainage a partir d'une fonction aleatoire injectee
 * (pure : la non-determinisme reste a l'appelant, ex `Math.random` dans une
 * mutation). L'appelant doit verifier l'unicite via l'index `by_referralCode`
 * et reessayer en cas de collision.
 */
export function makeReferralCode(random: () => number): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  }
  return code
}

/** Normalise un code saisi/recu (trim + majuscules) pour la resolution. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}
