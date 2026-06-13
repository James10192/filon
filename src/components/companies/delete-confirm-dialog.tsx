import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { cn } from '~/lib/utils'
import { buttonVariants } from '~/components/ui/button'

/**
 * Confirmation de suppression generique (AlertDialog Radix, jamais window.confirm).
 * Gere l'etat occupe pendant la mutation et delegue l'action au parent.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function confirm(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={busy}
            className={cn(
              buttonVariants({ variant: 'default' }),
              '!bg-danger !text-white hover:!bg-danger/90',
            )}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Supprimer definitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
