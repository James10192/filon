import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { RecoveryMode } from './types'

const OPTIONS: Array<{ value: RecoveryMode; label: string }> = [
  { value: 'manual', label: 'Manuel' },
  { value: 'semi_auto', label: 'Semi-automatique' },
  { value: 'automatic', label: 'Automatique' },
]

export function RecoveryModeSelect({
  value,
  onChange,
}: {
  value: RecoveryMode
  onChange: (value: RecoveryMode) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="mailpulse-mode">Mode de recouvrement</Label>
      <Select value={value} onValueChange={(next) => onChange(next as RecoveryMode)}>
        <SelectTrigger id="mailpulse-mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

