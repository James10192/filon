import { useQuery, useMutation } from 'convex/react'
import { ShieldCheck } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

type PermMode = 'ask' | 'accept' | 'auto' | 'bypass'

/**
 * Sélecteur d'autonomie du copilote (mode de permission des écritures).
 * Lit / écrit `aiPermissions`. En mode `ask`, chaque écriture est confirmée.
 */
export function CopilotPermissionSelect() {
  const prefs = useQuery(api.aiPermissions.get, {})
  const setPrefs = useMutation(api.aiPermissions.set)

  const options: { value: PermMode; label: string; desc: string }[] = [
    { value: 'ask', label: m.copilot_perm_ask(), desc: m.copilot_perm_ask_desc() },
    {
      value: 'accept',
      label: m.copilot_perm_accept(),
      desc: m.copilot_perm_accept_desc(),
    },
    { value: 'auto', label: m.copilot_perm_auto(), desc: m.copilot_perm_auto_desc() },
    {
      value: 'bypass',
      label: m.copilot_perm_bypass(),
      desc: m.copilot_perm_bypass_desc(),
    },
  ]

  return (
    <Select
      value={prefs?.mode ?? 'ask'}
      onValueChange={(value) => void setPrefs({ mode: value as PermMode })}
    >
      <SelectTrigger
        size="sm"
        className="h-8 gap-1.5 text-xs"
        aria-label={m.copilot_perm_label()}
      >
        <ShieldCheck className="size-3.5 text-fg-muted" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex flex-col">
              <span className="text-sm">{opt.label}</span>
              <span className="text-xs text-fg-muted">{opt.desc}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
