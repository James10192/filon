import { useQuery } from 'convex/react'
import { BookOpen, LifeBuoy, Megaphone, Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const DOCS_URL = 'https://filon-docs.vercel.app'

export function CopilotHelp({
  onPick,
}: {
  onPick: (prompt: string) => void
}) {
  const notifications = useQuery(api.notifications.list, {})
  const updates = (notifications ?? [])
    .filter((item) => item.kind === 'product_update')
    .slice(0, 5)

  const prompts = [
    'Explique-moi comment utiliser les propositions, les proformas et les relances dans Filon.',
    'Aide-moi à structurer mon pipeline commercial dans Filon, étape par étape.',
    'Résume-moi les nouveautés récentes de Filon et comment les utiliser au quotidien.',
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <LifeBuoy className="size-4 text-accent" />
            Aide Filon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-fg-muted">
            Utilisez cet espace pour retrouver la documentation, les dernières
            mises à jour produit et des demandes prêtes à envoyer au Copilot
            pour mieux utiliser Filon.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={DOCS_URL} target="_blank" rel="noreferrer">
                <BookOpen className="size-4" />
                Ouvrir la documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-accent" />
            Demandes prêtes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {prompts.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              onClick={() => onPick(prompt)}
              className="h-auto min-h-11 justify-start whitespace-normal px-3 py-3 text-left text-sm"
            >
              {prompt}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Megaphone className="size-4 text-accent" />
            Quoi de neuf
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications === undefined ? (
            <p className="text-sm text-fg-muted">
              Chargement des mises à jour...
            </p>
          ) : updates.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Aucune mise à jour produit publiée pour le moment.
            </p>
          ) : (
            updates.map((item) => (
              <div
                key={item._id}
                className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-fg">{item.title}</p>
                  <Badge variant="outline">Update</Badge>
                </div>
                <p className="mt-1 text-sm text-fg-muted">{item.body}</p>
                {item.actionUrl && (
                  <div className="mt-2">
                    <a
                      href={item.actionUrl}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {item.actionLabel ?? 'Voir la mise à jour'}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
