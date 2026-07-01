import { Mail, MessageCircle } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'
import type { MailPulseConnectionStatus, RecoveryChannel } from './types'

const CHANNELS: Array<{
  value: RecoveryChannel
  label: string
  icon: typeof Mail
}> = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

export function RecoveryChannelsSelector({
  value,
  onChange,
  connectionStatus,
}: {
  value: RecoveryChannel[]
  onChange: (value: RecoveryChannel[]) => void
  connectionStatus: MailPulseConnectionStatus
}) {
  const linked = connectionStatus === 'linked'

  function toggle(channel: RecoveryChannel) {
    if (value.includes(channel)) {
      onChange(value.filter((item) => item !== channel))
      return
    }
    onChange([...value, channel])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Canaux souhaites</Label>
        {!linked && <Badge variant="outline">MailPulse requis</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon
          const selected = value.includes(channel.value)
          return (
            <Button
              key={channel.value}
              type="button"
              variant={selected ? 'secondary' : 'outline'}
              className={cn(
                'justify-start',
                !linked && 'opacity-70',
              )}
              onClick={() => toggle(channel.value)}
            >
              <Icon className="size-4" />
              {channel.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

