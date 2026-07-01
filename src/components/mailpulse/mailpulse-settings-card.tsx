import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ExternalLink, Loader2, PlugZap } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { mailpulseConnectUrl, mailpulseSignupUrl } from '~/lib/mailpulse'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { MailPulseStatusBadge } from './mailpulse-status-badge'
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
    setHydrated(true)
  }, [settings, hydrated])

  if (settings === undefined) return <MailPulseSettingsSkeleton />

  const dirty =
    promptOnWon !== (settings.mailpulsePromptOnWon ?? true) ||
    fallbackEnabled !== (settings.recoveryFallbackFollowupEnabled ?? true) ||
    delayDays !== (settings.recoveryReminderDelayDays ?? 3) ||
    mode !== (settings.recoveryMode ?? 'semi_auto') ||
    status !== (settings.mailpulseConnectionStatus ?? 'not_linked') ||
    channels.join('|') !==
      (settings.recoveryPreferredChannels ?? DEFAULT_RECOVERY_CHANNELS).join('|')

  async function save() {
    setSaving(true)
    try {
      await upsert({
        mailpulsePromptOnWon: promptOnWon,
        mailpulseConnectionStatus: status,
        recoveryReminderDelayDays: delayDays,
        recoveryFallbackFollowupEnabled: fallbackEnabled,
        recoveryPreferredChannels: channels,
        recoveryMode: mode,
      })
      toast.success('Preferences MailPulse enregistrees')
    } catch {
      toast.error("Impossible d'enregistrer ces preferences")
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
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="size-4 text-fg-muted" />
              MailPulse & recouvrement
            </CardTitle>
            <p className="mt-1.5 text-sm text-fg-muted">
              Proposez MailPulse au moment ou une opportunite est gagnee.
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
            onClick={() =>
              markPendingAndOpen(
                mailpulseSignupUrl({ email: me?.email, name: me?.name }),
              )
            }
          >
            <ExternalLink className="size-4" />
            Creer un compte MailPulse
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => markPendingAndOpen(mailpulseConnectUrl())}
          >
            <PlugZap className="size-4" />
            Lier MailPulse
          </Button>
        </div>

        <Separator />

        <SwitchRow
          id="mailpulse-prompt"
          label="Proposer MailPulse quand une opportunite est gagnee"
          checked={promptOnWon}
          onCheckedChange={setPromptOnWon}
        />
        <SwitchRow
          id="mailpulse-fallback"
          label="Creer une relance locale si MailPulse n'est pas lie"
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

