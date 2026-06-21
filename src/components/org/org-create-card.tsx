import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

/**
 * Carte de création d'organisation (affichée quand le user n'appartient à
 * aucune org). Appelle `api.organizations.create` puis confirme par un toast ;
 * la query `organizations.mine` bascule alors le hub vers la vue équipe.
 */
export function OrgCreateCard() {
  const create = useMutation(api.organizations.create)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setPending(true)
    try {
      await create({ name: trimmed })
      toast.success(m.org_created_toast())
      setName('')
    } catch (err) {
      toast.error(errorMessage(err, m.org_create_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{m.org_create_title()}</CardTitle>
          <CardDescription>{m.org_create_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">{m.org_create_name_label()}</Label>
            <Input
              id="org-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.org_create_name_placeholder()}
              className="sm:max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {m.org_create_submit()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
