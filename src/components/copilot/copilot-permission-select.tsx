import { useQuery, useMutation } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { Lock, ShieldCheck } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { allowsAutonomousMode, permModeAllowed } from '~/lib/billing/plan'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from '~/components/ui/select'

type PermMode = 'ask' | 'accept' | 'auto' | 'bypass'

const OPTIONS: { value: PermMode; label: () => string; desc: () => string }[] = [
  { value: 'ask', label: m.copilot_perm_ask, desc: m.copilot_perm_ask_desc },
  { value: 'accept', label: m.copilot_perm_accept, desc: m.copilot_perm_accept_desc },
  { value: 'auto', label: m.copilot_perm_auto, desc: m.copilot_perm_auto_desc },
  { value: 'bypass', label: m.copilot_perm_bypass, desc: m.copilot_perm_bypass_desc },
]

/**
 * Sélecteur d'autonomie du copilote (mode de permission des écritures). Le
 * déclencheur reste compact (icône + libellé court) ; la description vit dans
 * les options du menu. Lit / écrit `aiPermissions`. En `ask`, chaque écriture
 * est confirmée.
 *
 * Les modes autonomes (Auto / Bypass) sont réservés au palier Copilot Max :
 * verrouillés (désactivés + cadenas + badge) pour les paliers inférieurs, avec
 * un renvoi vers les tarifs. Le serveur reste l'autorité (la mutation rejette
 * et le mode effectif est rabattu) ; ce verrou n'est que cosmétique.
 */
export function CopilotPermissionSelect() {
  const prefs = useQuery(api.aiPermissions.get, {})
  const myPlan = useQuery(api.billing.myPlan, {})
  const setPrefs = useMutation(api.aiPermissions.set)
  const mode = (prefs?.mode ?? 'ask') as PermMode
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0]
  const canAutonomous = allowsAutonomousMode(myPlan?.plan ?? 'free')

  return (
    <Select
      value={mode}
      onValueChange={(value) => {
        const next = value as PermMode
        // Garde-fou client : ne tente même pas un mode interdit (le serveur le
        // rejetterait de toute façon).
        if (!permModeAllowed(myPlan?.plan ?? 'free', next)) return
        void setPrefs({ mode: next })
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-auto gap-1.5 text-xs"
        aria-label={m.copilot_perm_label()}
      >
        <ShieldCheck className="size-3.5 text-fg-muted" />
        <span className="font-medium text-fg">{current.label()}</span>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => {
          const locked =
            (opt.value === 'auto' || opt.value === 'bypass') && !canAutonomous
          return (
            <SelectItem key={opt.value} value={opt.value} disabled={locked}>
              <span className="flex flex-col gap-0.5 py-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {opt.label()}
                  {locked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-medium text-accent">
                      <Lock className="size-2.5" />
                      {m.copilot_perm_locked_badge()}
                    </span>
                  )}
                </span>
                <span className="text-xs text-fg-muted">
                  {locked ? m.copilot_perm_locked_desc() : opt.desc()}
                </span>
              </span>
            </SelectItem>
          )
        })}
        {!canAutonomous && (
          <>
            <SelectSeparator />
            <Link
              to="/app/tarifs"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-accent hover:underline"
            >
              <Lock className="size-3" />
              {m.copilot_perm_upsell_cta()}
            </Link>
          </>
        )}
      </SelectContent>
    </Select>
  )
}
