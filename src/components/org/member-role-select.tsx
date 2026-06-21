import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ROLE_META, ROLE_ORDER, roleLabel, type OrgRole } from './roles'

/**
 * Sélecteur de rôle d'un membre. En lecture seule (`manageable=false`) ou pour
 * le propriétaire, affiche une puce statique. Sinon, un select qui appelle
 * `api.members.setRole` (optimiste + toast, rollback et message serveur sur
 * échec, ex. « dernier administrateur »).
 */
export function MemberRoleSelect({
  membershipId,
  role,
  manageable,
}: {
  membershipId: Id<'memberships'>
  role: OrgRole
  manageable: boolean
}) {
  const setRole = useMutation(api.members.setRole)
  const [optimistic, setOptimistic] = useState<OrgRole | null>(null)
  const [pending, setPending] = useState(false)
  const current = optimistic ?? role

  if (!manageable) {
    return (
      <span
        className={cn(
          'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium',
          ROLE_META[current].chip,
        )}
      >
        {roleLabel(current)}
      </span>
    )
  }

  async function onChange(next: OrgRole) {
    if (next === current) return
    const previous = current
    setOptimistic(next)
    setPending(true)
    try {
      await setRole({ membershipId, role: next })
      toast.success(m.member_role_changed_toast())
    } catch (err) {
      setOptimistic(previous === role ? null : previous)
      toast.error(errorMessage(err, m.member_role_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v as OrgRole)}
      disabled={pending}
    >
      <SelectTrigger className="h-8 w-[150px]" aria-label={m.member_col_role()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_ORDER.map((r) => (
          <SelectItem key={r} value={r}>
            {roleLabel(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
