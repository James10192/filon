import { Radar } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Card, Header, EmptyHint } from '../widgets/primitives'
import type { BriefSignal } from './types'

/** Libellé i18n de l'action suggérée par la veille. */
function actionLabel(action: BriefSignal['suggestedAction']): string {
  if (action === 'apply') return m.brief_signal_apply()
  if (action === 'prospect') return m.brief_signal_prospect()
  return m.brief_signal_ignore()
}

/**
 * Section « Veille » du brief : captures récentes (signaux IA) avec score de
 * pertinence et action suggérée. Lecture seule (la décision reste à l'humain).
 */
export function BriefSignals({ items }: { items: BriefSignal[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <Header icon={Radar} label={m.brief_signals_title()} />
        <EmptyHint text={m.brief_signals_empty()} />
      </Card>
    )
  }

  return (
    <Card>
      <Header icon={Radar} label={m.brief_signals_title()} />
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">
                {s.title ?? m.brief_signal_untitled()}
              </p>
              <p className="text-xs text-fg-subtle">{actionLabel(s.suggestedAction)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium tabular-nums text-accent">
              {s.score}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
