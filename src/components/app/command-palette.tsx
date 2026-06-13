import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  Building2,
  Send,
  BellRing,
  FileText,
  Settings,
  Plus,
  Search,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog'
import { useQuickCapture } from './quick-capture'

/**
 * Palette de commandes Cmd+K / Ctrl+K, sans dependance externe (pas de cmdk).
 *
 * - Dialog Radix (ui/dialog) + champ de recherche + liste filtrable.
 * - Navigation 100 % clavier : fleches haut/bas pour se deplacer, Entree pour
 *   declencher, Echap pour fermer (gere par le Dialog).
 * - Actions : naviguer vers chaque page de la nav, + "Nouvelle opportunite"
 *   (ouvre la capture rapide).
 *
 * Usage :
 *   <CommandPaletteProvider>...</CommandPaletteProvider>  // sous QuickCapture
 *   const { open, toggle } = useCommandPalette()
 */

type CommandAction = {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  /** Mots-cles supplementaires pour le filtrage. */
  keywords?: string
  run: () => void
}

type CommandPaletteContextValue = {
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
)

const NAV_TARGETS: {
  to: string
  label: string
  icon: LucideIcon
  keywords?: string
}[] = [
  { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, keywords: 'dashboard accueil pilotage' },
  { to: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare, keywords: 'kanban etapes board' },
  { to: '/app/opportunites', label: 'Opportunités', icon: Briefcase, keywords: 'pistes candidatures missions' },
  { to: '/app/entreprises', label: 'Entreprises', icon: Building2, keywords: 'societes companies carnet' },
  { to: '/app/propositions', label: 'Propositions', icon: Send, keywords: 'pitch demarchage proposals' },
  { to: '/app/relances', label: 'Relances', icon: BellRing, keywords: 'followups rappels echeances' },
  { to: '/app/documents', label: 'Documents', icon: FileText, keywords: 'cv lettres portfolio fichiers' },
  { to: '/app/parametres', label: 'Paramètres', icon: Settings, keywords: 'reglages settings preferences' },
]

/** Normalise (minuscules, sans accents) pour un filtrage tolerant. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const quickCapture = useQuickCapture()

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return (
    <CommandPaletteContext.Provider value={{ open, close, toggle, isOpen }}>
      {children}
      <PaletteDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onNavigate={(to) => {
          setIsOpen(false)
          void navigate({ to })
        }}
        onQuickCapture={() => {
          setIsOpen(false)
          quickCapture.open()
        }}
      />
    </CommandPaletteContext.Provider>
  )
}

function PaletteDialog({
  isOpen,
  setIsOpen,
  onNavigate,
  onQuickCapture,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onNavigate: (to: string) => void
  onQuickCapture: () => void
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const actions = useMemo<CommandAction[]>(() => {
    const navActions: CommandAction[] = NAV_TARGETS.map((t) => ({
      id: `nav:${t.to}`,
      label: t.label,
      hint: 'Aller a',
      icon: t.icon,
      keywords: t.keywords,
      run: () => onNavigate(t.to),
    }))
    const createAction: CommandAction = {
      id: 'action:new-opportunity',
      label: 'Nouvelle opportunite',
      hint: 'Creer',
      icon: Plus,
      keywords: 'ajouter creer capture rapide piste',
      run: onQuickCapture,
    }
    return [createAction, ...navActions]
  }, [onNavigate, onQuickCapture])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return actions
    return actions.filter((a) =>
      normalize(`${a.label} ${a.keywords ?? ''} ${a.hint ?? ''}`).includes(q),
    )
  }, [actions, query])

  // Reinitialise la saisie + selection a chaque ouverture.
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen])

  // Maintient l'index actif dans les bornes apres filtrage.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const action = filtered[activeIndex]
      if (action) action.run()
    }
  }

  // Garde l'item actif visible.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Palette de commandes</DialogTitle>
        <DialogDescription className="sr-only">
          Recherchez une page ou une action. Fleches pour naviguer, Entree pour
          valider.
        </DialogDescription>

        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page ou une action..."
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            aria-label="Rechercher"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={
              filtered[activeIndex]
                ? `cmd-${filtered[activeIndex].id}`
                : undefined
            }
          />
        </div>

        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-[min(60dvh,360px)] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-fg-subtle">
              Aucun resultat.
            </p>
          ) : (
            filtered.map((action, index) => {
              const Icon = action.icon
              const active = index === activeIndex
              return (
                <button
                  key={action.id}
                  id={`cmd-${action.id}`}
                  data-index={index}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={action.run}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-fg hover:bg-surface-2',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-accent' : 'text-fg-subtle',
                    )}
                  />
                  <span className="flex-1 truncate font-medium">
                    {action.label}
                  </span>
                  {action.hint && (
                    <span className="shrink-0 text-xs text-fg-subtle">
                      {action.hint}
                    </span>
                  )}
                  {active && (
                    <CornerDownLeft className="size-3.5 shrink-0 text-accent" />
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans">
              ↑↓
            </kbd>
            naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans">
              ↵
            </kbd>
            ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans">
              Echap
            </kbd>
            fermer
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error(
      'useCommandPalette doit etre utilise dans un <CommandPaletteProvider>.',
    )
  }
  return ctx
}
