import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { authClient } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from '~/components/ui/sonner'
import { AuthShell } from '~/components/marketing/auth-shell'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/inscription')({
  component: InscriptionPage,
  head: () => ({
    meta: [
      { title: 'Créer votre compte Filon' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

const schema = z.object({
  name: z.string().trim().min(1, 'Renseignez votre nom.'),
  email: z
    .string()
    .trim()
    .min(1, 'Renseignez votre adresse e-mail.')
    .pipe(z.email('Adresse e-mail invalide.')),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
})

type FieldKey = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldKey, string>>

function InscriptionPage() {
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const fd = new FormData(e.currentTarget)
    const parsed = schema.safeParse({
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    })

    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'name' || key === 'email' || key === 'password') {
          next[key] = next[key] ?? issue.message
        }
      }
      setErrors(next)
      return
    }

    setSubmitting(true)
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      setSubmitting(false)
      const code = error.code ?? ''
      const message =
        code === 'USER_ALREADY_EXISTS' ||
        error.status === 422 ||
        /exist|already/i.test(error.message ?? '')
          ? 'Un compte existe déjà avec cette adresse e-mail.'
          : "La création du compte a échoué. Réessayez."
      setFormError(message)
      toast.error(message)
      return
    }

    toast.success('Compte créé. Bienvenue sur Filon.')
    // Rechargement complet pour propager le JWT à Convex.
    window.location.href = '/app'
  }

  return (
    <AuthShell
      title="Créer votre compte Filon"
      subtitle="Quelques secondes pour centraliser toutes vos opportunités."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link
            to="/connexion"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Connectez-vous
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Votre nom"
            autoComplete="name"
            autoFocus
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-danger">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-danger">
              {errors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Au moins 8 caractères"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-danger">
              {errors.password}
            </p>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className={cn(
              'flex items-center gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger',
            )}
          >
            <AlertCircle className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? 'Création…' : 'Créer mon compte'}
        </Button>

        <p className="text-center text-xs text-fg-subtle">
          En créant un compte, vous acceptez nos conditions d'utilisation.
        </p>
      </form>
    </AuthShell>
  )
}
