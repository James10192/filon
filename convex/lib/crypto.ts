/**
 * Chiffrement au repos des secrets utilisateur (BYOK : clés API « apportez la
 * vôtre »). AES-256-GCM via Web Crypto (`crypto.subtle`, disponible dans le
 * runtime Convex par défaut). On ne stocke JAMAIS de clé en clair, on ne la
 * journalise JAMAIS, et on ne la renvoie JAMAIS au client (seul un suffixe
 * `last4` non sensible sert à l'affichage).
 *
 * Garde-fou : `BYOK_ENCRYPTION_KEY` (32 octets en base64, soit AES-256) est
 * REQUIS. Son absence ou une longueur invalide fait échouer FORT (throw), pour
 * qu'aucune donnée ne soit jamais écrite avec un chiffrement dégradé/absent.
 *
 * AAD (additional authenticated data) = `userId:provider` : lie le chiffré à son
 * propriétaire et à son fournisseur. Un chiffré exfiltré et réinséré sur une
 * autre ligne `users` (autre `userId`) échoue au déchiffrement (intégrité).
 */

const ALGO = 'AES-GCM'
const IV_BYTES = 12 // 96 bits, recommandé pour GCM

/**
 * Copie défensive en `ArrayBuffer` standalone. Sous TS 5.7+, `Uint8Array` est
 * générique (`Uint8Array<ArrayBufferLike>`) et n'est plus directement assignable
 * à `BufferSource` (qui exige un `ArrayBuffer`, pas un éventuel `SharedArrayBuffer`).
 * `.slice()` matérialise un buffer propre, accepté par toute l'API Web Crypto.
 */
function ab(u: Uint8Array): ArrayBuffer {
  return u.slice().buffer as ArrayBuffer
}

/** Décode une base64 (standard) en `Uint8Array`, sans dépendance Node. */
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Encode des octets en base64 (standard). */
function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/**
 * Importe la clé maître depuis l'environnement. Échoue FORT si elle est absente
 * ou ne fait pas 32 octets (AES-256) : on refuse de chiffrer avec une clé
 * dégradée plutôt que d'écrire un secret mal protégé.
 */
async function masterKey() {
  const raw = process.env.BYOK_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'BYOK_ENCRYPTION_KEY manquant : impossible de chiffrer une clé utilisateur.',
    )
  }
  let bytes: Uint8Array
  try {
    bytes = fromBase64(raw)
  } catch {
    throw new Error('BYOK_ENCRYPTION_KEY invalide (base64 attendu).')
  }
  if (bytes.length !== 32) {
    throw new Error(
      `BYOK_ENCRYPTION_KEY invalide : 32 octets attendus (AES-256), ${bytes.length} reçus.`,
    )
  }
  return crypto.subtle.importKey('raw', ab(bytes), ALGO, false, [
    'encrypt',
    'decrypt',
  ])
}

/** AAD liant le chiffré à son propriétaire + fournisseur (anti-rejeu cross-user). */
function aad(userId: string, provider: string): Uint8Array {
  return new TextEncoder().encode(`${userId}:${provider}`)
}

/**
 * Chiffre `plaintext` (la clé API en clair) pour `userId` + `provider`. Renvoie
 * une chaîne auto-portée `base64(iv).base64(ciphertext)` : l'IV aléatoire est
 * préfixé, le tag GCM est inclus dans le `ciphertext`. Jamais de clé en clair
 * dans le retour.
 */
export async function encryptSecret(
  plaintext: string,
  userId: string,
  provider: string,
): Promise<string> {
  const key = await masterKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ct = await crypto.subtle.encrypt(
    { name: ALGO, iv: ab(iv), additionalData: ab(aad(userId, provider)) },
    key,
    ab(new TextEncoder().encode(plaintext)),
  )
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ct))}`
}

/**
 * Déchiffre une chaîne produite par `encryptSecret`. Le déchiffrement échoue
 * (throw) si l'AAD ne correspond pas (mauvais `userId`/`provider`) ou si le
 * chiffré est altéré — propriété d'intégrité de GCM.
 */
export async function decryptSecret(
  payload: string,
  userId: string,
  provider: string,
): Promise<string> {
  const dot = payload.indexOf('.')
  if (dot === -1) throw new Error('Chiffré BYOK malformé.')
  const iv = fromBase64(payload.slice(0, dot))
  const ct = fromBase64(payload.slice(dot + 1))
  const pt = await crypto.subtle.decrypt(
    { name: ALGO, iv: ab(iv), additionalData: ab(aad(userId, provider)) },
    await masterKey(),
    ab(ct),
  )
  return new TextDecoder().decode(pt)
}

/** Suffixe non sensible (4 derniers caractères) pour l'affichage « ••••abcd ». */
export function last4(secret: string): string {
  return secret.slice(-4)
}
