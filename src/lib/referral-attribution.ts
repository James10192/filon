import { useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Attribution du parrainage cote client.
 *
 * Boucle : un lien `?ref=CODE` arrive sur une page publique → `useCaptureRef`
 * memorise le code (localStorage) → une fois l'utilisateur authentifie,
 * `useClaimReferral` appelle la mutation `claimReferral` (best-effort, idempotente
 * cote serveur) puis nettoie. Decouple : la capture ne depend pas de Convex, le
 * claim ne tourne que dans la zone authentifiee.
 */
const REF_KEY = 'filon_ref'

/** Capture le code `?ref=` de l'URL et le memorise (a monter sur les pages publiques). */
export function useCaptureRef(): void {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('ref')
      if (code && code.trim()) {
        window.localStorage.setItem(REF_KEY, code.trim())
      }
    } catch {
      /* localStorage indisponible : on ignore */
    }
  }, [])
}

/** Reclame le parrainage memorise une fois l'utilisateur authentifie. */
export function useClaimReferral(): void {
  const claim = useMutation(api.referrals.claimReferral)
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    let code: string | null = null
    try {
      code = window.localStorage.getItem(REF_KEY)
    } catch {
      /* localStorage indisponible */
    }
    if (!code) return
    done.current = true
    claim({ code })
      .then((res) => {
        // Nettoyer sauf si le doc user n'est pas encore resolu (race transitoire).
        if (!res || res.ok || res.reason !== 'no_user') {
          try {
            window.localStorage.removeItem(REF_KEY)
          } catch {
            /* ignore */
          }
        } else {
          done.current = false
        }
      })
      .catch(() => {
        done.current = false
      })
  }, [claim])
}
