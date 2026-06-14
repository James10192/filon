import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { authClient, useSession } from '~/lib/auth/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from '~/components/ui/sonner'
import { AuthShell } from '~/components/marketing/auth-shell'
import { cn } from '~/lib/utils'
import { m } from '~/lib/paraglide/messages'

export const Route = createFileRoute('/connexion')({
  component: ConnexionPage,
  head: () => ({
    meta: [
      { title: 'Connexion à Filon' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Renseignez votre adresse e-mail.')
    .pipe(z.email('Adresse e-mail invalide.')),
  password: z.string().min(1, 'Renseignez votre mot de passe.'),
})

type FieldErrors = Partial<Record<'email' | 'password', string>>

function ConnexionPage() {
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  // Utilisateur déjà connecté : on l'envoie vers son espace.
  useEffect(() => {
    if (!isPending && session) {
      navigate({ to: '/app', replace: true })
    }
  }, [isPending, session, navigate])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const fd = new FormData(e.currentTarget)
    const parsed = schema.safeParse({
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    })

    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'email' || key === 'password') {
          next[key] = next[key] ?? issue.message
        }
      }
      setErrors(next)
      return
    }

    setSubmitting(true)
    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      rememberMe: true,
    })

    if (error) {
      setSubmitting(false)
      const message = m.login_error_invalid()
      setFormError(message)
      toast.error(message)
      return
    }

    toast.success(m.login_success())
    // Rechargement complet pour propager le JWT à Convex.
    window.location.href = '/app'
  }

  return (
    <AuthShell
      title={m.login_title()}
      subtitle={m.login_subtitle()}
      footer={
        <>
          {m.login_footer_text()}{' '}
          <Link
            to="/inscription"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {m.login_footer_link()}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{m.login_label_email()}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            autoComplete="email"
            autoFocus
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
          <Label htmlFor="password">{m.login_label_password()}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
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
          {submitting ? m.login_submitting() : m.login_submit()}
        </Button>
      </form>
    </AuthShell>
  )
}
