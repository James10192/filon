import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const OPTIONS = [
  { value: 0, label: 'Le jour même' },
  { value: 3, label: 'Après 3 jours' },
  { value: 7, label: 'Après 7 jours' },
  { value: 14, label: 'Après 14 jours' },
]

export function RecoveryDelaySelect({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="mailpulse-delay">Rappel local</Label>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id="mailpulse-delay">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

