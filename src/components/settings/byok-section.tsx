import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

/**
 * Section « Clé IA personnelle » (BYOK). Permet à un utilisateur d'un palier
 * Copilot de brancher sa propre clé OpenRouter : le copilote l'utilise alors
 * sans consommer ses crédits Filon. Le serveur reste l'autorité (éligibilité
 * + validation de la clé). États gérés : loading, verrouillé (palier inférieur),
 * actif (clé posée), vide (saisie), succès / erreur (toast).
 */
export function ByokSection() {
  const status = useQuery(api.byok.status, {})
  const setKey = useAction(api.byok.setKey)
  const removeKey = useMutation(api.byok.removeKey)

  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  if (status === undefined) return <ByokSkeleton />

  // Palier inférieur : carte verrouillée + renvoi vers les tarifs.
  if (!status.eligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-fg-muted" />
            {m.app_byok_title()}
          </CardTitle>
          <CardDescription>{m.app_byok_locked_desc()}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" asChild>
            <Link to="/app/tarifs">
              <Lock className="size-4" />
              {m.app_byok_upsell_cta()}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setSaving(true)
    try {
      const { last4 } = await setKey({ key: value.trim() })
      setValue('')
      toast.success(m.app_byok_saved({ last4 }))
    } catch (error) {
      toast.error(errorMessage(error, m.app_byok_error()))
    } finally {
      setSaving(false)
    }
  }

  async function onRemove() {
    setRemoving(true)
    try {
      await removeKey({})
      toast.success(m.app_byok_removed())
    } catch (error) {
      toast.error(errorMessage(error, m.app_byok_error()))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-fg-muted" />
          {m.app_byok_title()}
          {status.hasKey && (
            <Badge variant="accent" className="gap-1">
              <ShieldCheck className="size-3" />
              {m.app_byok_active()}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{m.app_byok_description()}</CardDescription>
      </CardHeader>

      {status.hasKey ? (
        <>
          <CardContent>
            <p className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
              {m.app_byok_active_desc({ last4: status.last4 ?? '••••' })}
            </p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <p className="text-xs text-fg-subtle">{m.app_byok_active_hint()}</p>
            <Button
              variant="outline"
              onClick={onRemove}
              disabled={removing}
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              {m.app_byok_remove()}
            </Button>
          </CardFooter>
        </>
      ) : (
        <form onSubmit={onSave}>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="byok-key">{m.app_byok_key_label()}</Label>
            <Input
              id="byok-key"
              type="password"
              autoComplete="off"
              placeholder="sk-or-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-fg-subtle">{m.app_byok_help()}</p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving || !value.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {m.app_byok_save()}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

function ByokSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  )
}
