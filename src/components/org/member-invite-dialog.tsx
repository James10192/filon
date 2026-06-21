import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, UserPlus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ROLE_META, ROLE_ORDER, roleLabel, type OrgRole } from './roles'

/**
 * Dialog d'invitation par e-mail (admin). Choisit un rôle, appelle
 * `api.members.invite` (le serveur valide doublon/auto-invitation/limite de
 * membres et notifie la personne si elle a déjà un compte).
 */
export function MemberInviteDialog({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const invite = useMutation(api.members.invite)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('commercial')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPending(true)
    try {
      await invite({ organizationId, email: email.trim(), role })
      toast.success(m.member_invited_toast())
      setEmail('')
      setRole('commercial')
      setOpen(false)
    } catch (err) {
      toast.error(errorMessage(err, m.member_invite_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">{m.member_invite_button()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.member_invite_title()}</DialogTitle>
          <DialogDescription>{m.member_invite_description()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">{m.member_invite_email_label()}</Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={m.member_invite_email_placeholder()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">{m.member_invite_role_label()}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex flex-col">
                      <span>{roleLabel(r)}</span>
                      <span className="text-xs text-fg-subtle">
                        {ROLE_META[r].desc()}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {m.member_invite_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
