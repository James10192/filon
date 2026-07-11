import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ExternalLink, Info, Loader2, PlugZap } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { mailpulseConnectUrl, mailpulseSignupUrl } from '~/lib/mailpulse'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { MailPulseStatusBadge } from './mailpulse-status-badge'
import {
  MailPulseLogo,
  MailPulseWordmark,
  mailpulsePanelClassName,
} from './mailpulse-brand'
import { RecoveryChannelsSelector } from './recovery-channels-selector'
import { RecoveryDelaySelect } from './recovery-delay-select'
import { RecoveryModeSelect } from './recovery-mode-select'
import {
  DEFAULT_RECOVERY_CHANNELS,
  type MailPulseConnectionStatus,
  type MailPulseSettings,
  type RecoveryChannel,
  type RecoveryMode,
} from './types'

type Me = { email?: string; name?: string } | null | undefined

export function MailPulseSettingsCard() {
  const settings = useQuery(api.settings.get, {}) as
    | MailPulseSettings
    | undefined
  const me = useQuery(api.users.me, {}) as Me
  const upsert = useMutation(api.settings.upsert)

  const [promptOnWon, setPromptOnWon] = useState(true)
  const [fallbackEnabled, setFallbackEnabled] = useState(true)
  const [delayDays, setDelayDays] = useState(3)
  const [mode, setMode] = useState<RecoveryMode>('semi_auto')
  const [channels, setChannels] = useState<RecoveryChannel[]>(
    DEFAULT_RECOVERY_CHANNELS,
  )
  const [status, setStatus] =
    useState<MailPulseConnectionStatus>('not_linked')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings === undefined || hydrated) return
    setPromptOnWon(settings.mailpulsePromptOnWon ?? true)
    setFallbackEnabled(settings.recoveryFallbackFollowupEnabled ?? true)
    setDelayDays(settings.recoveryReminderDelayDays ?? 3)
    setMode(settings.recoveryMode ?? 'semi_auto')
    setChannels(settings.recoveryPreferredChannels ?? DEFAULT_RECOVERY_CHANNELS)
    setStatus(settings.mailpulseConnectionStatus ?? 'not_linked')
    setBaseUrl(settings.mailpulseBaseUrl ?? '')
    setHydrated(true)
  }, [settings, hydrated])

  if (settings === undefined) return <MailPulseSettingsSkeleton />

  const dirty =
    promptOnWon !== (settings.mailpulsePromptOnWon ?? true) ||
    fallbackEnabled !== (settings.recoveryFallbackFollowupEnabled ?? true) ||
    delayDays !== (settings.recoveryReminderDelayDays ?? 3) ||
    mode !== (settings.recoveryMode ?? 'semi_auto') ||
    status !== (settings.mailpulseConnectionStatus ?? 'not_linked') ||
    baseUrl !== (settings.mailpulseBaseUrl ?? '') ||
    apiKey.trim().length > 0 ||
    channels.join('|') !==
      (settings.recoveryPreferredChannels ?? DEFAULT_RECOVERY_CHANNELS).join('|')

  async function save() {
    const normalizedBaseUrl = normalizeMailPulseUrlInput(baseUrl)
    if (baseUrl.trim() && !normalizedBaseUrl) {
      toast.error("Renseignez une URL ou un endpoint MailPulse valide")
      return
    }

    setSaving(true)
    try {
      const trimmedApiKey = apiKey.trim()
      const payload = {
        mailpulsePromptOnWon: promptOnWon,
        mailpulseConnectionStatus: status,
        recoveryReminderDelayDays: delayDays,
        recoveryFallbackFollowupEnabled: fallbackEnabled,
        recoveryPreferredChannels: channels,
        recoveryMode: mode,
        mailpulseBaseUrl: normalizedBaseUrl ?? '',
      }
      await upsert(
        trimmedApiKey ? { ...payload, mailpulseApiKey: trimmedApiKey } : payload,
      )
      setBaseUrl(normalizedBaseUrl ?? '')
      if (trimmedApiKey) setStatus('linked')
      setApiKey('')
      toast.success('Préférences MailPulse enregistrées')
    } catch {
      toast.error("Impossible d'enregistrer ces préférences")
    } finally {
      setSaving(false)
    }
  }

  async function markPendingAndOpen(url: string) {
    setStatus('pending')
    await upsert({ mailpulseConnectionStatus: 'pending' })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3">
              <MailPulseLogo />
              <span className="flex min-w-0 flex-col gap-1">
                <MailPulseWordmark className="text-base" showLogo={false} />
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  Recouvrement email et WhatsApp
                </span>
              </span>
            </CardTitle>
            <p className="mt-1.5 max-w-xl text-pretty text-sm text-fg-muted">
              Proposez MailPulse au moment où une opportunité est gagnée.
            </p>
          </div>
          <MailPulseStatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="transition-transform active:scale-[0.96]"
            onClick={() =>
              markPendingAndOpen(
                mailpulseSignupUrl({ email: me?.email, name: me?.name }),
              )
            }
          >
            <ExternalLink className="size-4" />
            Créer un compte MailPulse
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="transition-transform active:scale-[0.96]"
            onClick={() => markPendingAndOpen(mailpulseConnectUrl())}
          >
            <PlugZap className="size-4" />
            Lier MailPulse
          </Button>
        </div>

        <Separator />

        <div className={`grid gap-4 rounded-lg border p-4 ${mailpulsePanelClassName}`}>
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Connexion API MailPulse
            </h3>
            <p className="mt-1 text-pretty text-xs text-fg-muted">
              Collez l'adresse MailPulse, puis la clé Filon générée dans MailPulse.
            </p>
          </div>
          <div className="flex gap-2 rounded-[var(--radius-sm)] bg-orange-100/70 p-3 text-xs text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
            <Info className="mt-0.5 size-4 shrink-0 text-orange-700 dark:text-orange-300" />
            <p className="text-pretty">
              Si MailPulse affiche « Endpoint Filon », vous pouvez le coller ici.
              Filon gardera automatiquement le domaine MailPulse, par exemple
              https://mailpulse-two.vercel.app.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-2">
              <Label htmlFor="mailpulse-url">URL ou endpoint MailPulse</Label>
              <Input
                id="mailpulse-url"
                value={baseUrl}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoComplete="off"
                placeholder="https://mailpulse-two.vercel.app"
                onChange={(event) => setBaseUrl(event.target.value)}
              />
              <p className="text-xs text-fg-subtle">
                Exemple accepté : https://mailpulse-two.vercel.app/api/integrations/filon/recovery
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mailpulse-api-key">Clé API Filon</Label>
              <Input
                id="mailpulse-api-key"
                value={apiKey}
                type="password"
                placeholder={
                  settings.mailpulseApiKeyPreview ?? 'mp_filon_...'
                }
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span className="rounded-full bg-orange-100 px-2 py-1 font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {settings.mailpulseApiKeySet ? 'Clé active' : 'Clé absente'}
            </span>
            {settings.mailpulseApiKeyPreview && (
              <span>Dernière clé : {settings.mailpulseApiKeyPreview}</span>
            )}
          </div>
        </div>

        <SwitchRow
          id="mailpulse-prompt"
          label="Proposer MailPulse quand une opportunité est gagnée"
          checked={promptOnWon}
          onCheckedChange={setPromptOnWon}
        />
        <SwitchRow
          id="mailpulse-fallback"
          label="Créer une relance locale si MailPulse n'est pas lié"
          checked={fallbackEnabled}
          onCheckedChange={setFallbackEnabled}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <RecoveryDelaySelect value={delayDays} onChange={setDelayDays} />
          <RecoveryModeSelect value={mode} onChange={setMode} />
        </div>

        <RecoveryChannelsSelector
          value={channels}
          onChange={setChannels}
          connectionStatus={status}
        />
      </CardContent>

      <CardFooter className="justify-end">
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  )
}

function normalizeMailPulseUrlInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.includes('@')) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (!url.hostname.includes('.')) return null
    return url.origin.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function MailPulseSettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

