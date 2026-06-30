import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Megaphone, Send } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { toast } from '~/components/ui/sonner'

export function AdminUpdatesPanel() {
  const publishUpdate = useMutation(api.admin.publishProductUpdate)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!title.trim()) {
      toast.error('Le titre est requis.')
      return
    }
    if (!body.trim()) {
      toast.error('Le contenu est requis.')
      return
    }

    setSending(true)
    try {
      const result = await publishUpdate({
        title: title.trim(),
        body: body.trim(),
        ...(actionUrl.trim() ? { actionUrl: actionUrl.trim() } : {}),
      })
      toast.success(`Mise à jour envoyée à ${result.sent} utilisateur(s).`)
      setTitle('')
      setBody('')
      setActionUrl('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi impossible.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Publier une actu produit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="update-title">Titre</Label>
            <Input
              id="update-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. Nouveau centre d’incidents dans l’admin"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-body">Message</Label>
            <Textarea
              id="update-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Décris brièvement ce qui a changé, pour quoi faire et où le trouver."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-link">Lien optionnel</Label>
            <Input
              id="update-link"
              value={actionUrl}
              onChange={(event) => setActionUrl(event.target.value)}
              placeholder="/app/admin ou https://filon-xi.vercel.app/app/tarifs"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={sending}>
              <Send className="size-4" />
              Publier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comportement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-fg-muted">
          <div className="flex items-start gap-2 rounded-[var(--radius)] bg-surface-2 px-3 py-3">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>
              Chaque publication crée une notification in-app pour tous les comptes
              actifs.
            </p>
          </div>
          <p>
            Le lien est optionnel. S’il est renseigné, la cloche affichera un CTA
            “Voir la mise à jour”.
          </p>
          <p>
            Quand un feedback passe en statut traité, son auteur reçoit aussi une
            notification dédiée.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
