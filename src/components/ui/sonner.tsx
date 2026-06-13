import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Toaster global (montré une fois dans `__root.tsx`). Style aligné sur le
 * design system : surface + bordure + ombre pop, coin bas-droite (desktop),
 * pleine largeur en haut sur mobile (géré par sonner). Toast sur chaque action.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-[var(--radius)] !border !border-border !bg-surface !text-fg !shadow-[var(--shadow-pop)]',
          description: '!text-fg-muted',
          actionButton: '!bg-accent !text-accent-fg',
          cancelButton: '!bg-surface-2 !text-fg',
          success: '!text-success',
          error: '!text-danger',
          warning: '!text-warning',
          info: '!text-info',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--color-surface)',
          '--normal-text': 'var(--color-fg)',
          '--normal-border': 'var(--color-border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
export { toast } from 'sonner'
