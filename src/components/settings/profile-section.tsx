import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
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
import { Skeleton } from '~/components/ui/skeleton'

const MAX_NAME = 80
const MAX_HEADLINE = 120

type Profile = {
  email?: string
  name?: string
  headline?: string
} | null

/**
 * Section profil : nom affiche et accroche professionnelle. L'e-mail est en
 * lecture seule (gere par l'authentification). Les donnees viennent du domaine
 * `users` (contrat `api.users.me` / `api.users.updateProfile`).
 * Etats geres : loading (skeleton), succes/erreur (toast + message inline).
 */
export function ProfileSection() {
  const me = useQuery(api.users.me, {}) as Profile | undefined
  const updateProfile = useMutation(api.users.updateProfile)

  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On initialise les champs une seule fois, au premier chargement des donnees,
  // pour ne pas ecraser la saisie en cours sur une mise a jour temps reel.
  useEffect(() => {
    if (me !== undefined && me !== null && !hydrated) {
      setName(me.name ?? '')
      setHeadline(me.headline ?? '')
      setHydrated(true)
    }
  }, [me, hydrated])

  if (me === undefined) return <ProfileSkeleton />

  const email = me?.email ?? ''
  const dirty =
    name.trim() !== (me?.name ?? '') || headline.trim() !== (me?.headline ?? '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Le nom est requis.')
      return
    }

    setSaving(true)
    setError(null)
    // On ne transmet que les champs definis (jamais `undefined` en arg Convex).
    const args: { name?: string; headline?: string } = { name: trimmedName }
    args.headline = headline.trim()

    try {
      await updateProfile(args)
      toast.success('Modifications enregistrées.')
    } catch {
      toast.error("Les modifications n'ont pas pu être enregistrées.")
      setError('Les modifications n’ont pas pu être enregistrées. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Ces informations personnalisent votre espace. Le nom apparaît dans
            le menu de votre compte.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nom</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Marcel Djedjé"
              aria-invalid={Boolean(error) && !name.trim()}
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-headline">Accroche</Label>
            <Input
              id="profile-headline"
              value={headline}
              maxLength={MAX_HEADLINE}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ex. Développeur full-stack · freelance"
            />
            <p className="text-xs text-fg-subtle">
              Une ligne qui vous décrit. Optionnelle.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">Adresse e-mail</Label>
            <Input
              id="profile-email"
              value={email}
              readOnly
              disabled
              className="text-fg-muted"
            />
            <p className="text-xs text-fg-subtle">
              L’adresse e-mail est liée à votre connexion et ne peut pas être
              modifiée ici.
            </p>
          </div>

          {error && (
            <p className="text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
