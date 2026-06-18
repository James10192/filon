import { Component, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'

/**
 * Frontière d'erreur du panneau de détail. Les queries Convex `get` lèvent
 * « Introuvable » / « Non autorisé » plutôt que de renvoyer null ; cette
 * frontière capte l'erreur pour afficher un état propre sans casser l'espace.
 *
 * `resetKey` (l'id sélectionné) force un remount au changement de sélection :
 * une nouvelle sélection après une erreur réessaie proprement.
 */
export class PaneErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onClose: () => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <TriangleAlert className="size-6" />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-fg">
              {m.prop_not_found_title()}
            </h2>
            <p className="mx-auto max-w-xs text-sm text-fg-muted">
              {m.prop_not_found_message()}
            </p>
          </div>
          <Button variant="outline" onClick={this.props.onClose}>
            {m.prop_close()}
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
