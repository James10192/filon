import { useQuery, useMutation } from 'convex/react'
import { ShieldCheck } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import {
  Select,
  SelectContent,
  SelectItem,
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
 */
export function CopilotPermissionSelect() {
  const prefs = useQuery(api.aiPermissions.get, {})
  const setPrefs = useMutation(api.aiPermissions.set)
  const mode = (prefs?.mode ?? 'ask') as PermMode
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0]

  return (
    <Select
      value={mode}
      onValueChange={(value) => void setPrefs({ mode: value as PermMode })}
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
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex flex-col gap-0.5 py-0.5">
              <span className="text-sm font-medium">{opt.label()}</span>
              <span className="text-xs text-fg-muted">{opt.desc()}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
