/**
 * Envoi d'e-mails transactionnels via l'API HTTP de Resend.
 *
 * Pas de SDK : un simple `fetch` (disponible dans le runtime Convex par défaut)
 * suffit et évite une dépendance. Si `RESEND_API_KEY` est absente, on ÉCHOUE
 * bruyamment (throw) au lieu de faire un no-op silencieux : un utilisateur ne
 * doit jamais voir « e-mail envoyé » alors que rien n'est parti.
 *
 * Config requise (variables d'environnement Convex) :
 *  - RESEND_API_KEY : clé API Resend.
 *  - RESEND_FROM    : expéditeur vérifié, ex. « Filon <no-reply@filon.app> ».
 *                     Défaut de repli (sandbox Resend) réservé aux tests.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Expéditeur par défaut : sandbox Resend (n'envoie qu'au propriétaire du compte). */
const DEFAULT_FROM = 'Filon <onboarding@resend.dev>'

export type EmailPayload = {
  to: string
  subject: string
  html: string
}

/**
 * Envoie un e-mail via Resend. Throw si la config manque ou si Resend refuse
 * l'envoi (jamais de succès silencieux).
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "Envoi d'e-mail indisponible : RESEND_API_KEY n'est pas configurée.",
    )
  }
  const from = process.env.RESEND_FROM ?? DEFAULT_FROM

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Échec de l'envoi de l'e-mail (Resend ${res.status}). ${detail.slice(0, 200)}`,
    )
  }
}

/** Gabarit e-mail sobre, cohérent avec l'identité Filon (accent + monochrome). */
function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f6f5;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e7e4;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px;">
        <span style="display:inline-block;font-weight:700;font-size:18px;letter-spacing:-0.02em;color:#1c1c1a;">Filon</span>
      </td></tr>
      <tr><td style="padding:8px 32px 28px;">
        <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3;font-weight:650;color:#1c1c1a;">${title}</h1>
        ${bodyHtml}
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#8a8a84;">Filon · Abidjan, Côte d’Ivoire</p>
  </td></tr></table>
</body></html>`
}

/** E-mail de réinitialisation de mot de passe (lien vers la page de reset). */
export async function sendPasswordResetEmail(args: {
  to: string
  resetUrl: string
}): Promise<void> {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3a;">Vous avez demandé à réinitialiser votre mot de passe Filon. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <p style="margin:0 0 24px;">
      <a href="${args.resetUrl}" style="display:inline-block;background:#1c1c1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:11px 20px;border-radius:10px;">Réinitialiser mon mot de passe</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8a84;">Ce lien expire sous une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>`
  await sendEmail({
    to: args.to,
    subject: 'Réinitialisation de votre mot de passe Filon',
    html: emailShell('Réinitialisation du mot de passe', body),
  })
}
