import { Link, ShieldCheck, Unlink } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import type { MailPulseConnectionStatus } from './types'

export function MailPulseStatusBadge({
  status = 'not_linked',
}: {
  status?: MailPulseConnectionStatus
}) {
  if (status === 'linked') {
    return (
      <Badge variant="success">
        <ShieldCheck className="size-3" />
        Lié
      </Badge>
    )
  }

  if (status === 'pending') {
    return (
      <Badge variant="warning">
        <Link className="size-3" />
        À finaliser
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      <Unlink className="size-3" />
      Non lié
    </Badge>
  )
}

