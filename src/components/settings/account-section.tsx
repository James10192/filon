import { useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'
import { authClient } from '~/lib/auth/auth-client'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'

/**
 * Zone compte : deconnexion. La deconnexion passe par une confirmation Radix
 * (jamais `window.confirm`). Apres succes, on recharge sur la landing pour
 * purger le jeton cote client (cf. convention SaaS : `window.location.href`).
 */
export function AccountSection() {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function onSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = '/'
          },
        },
      })
    } catch {
      setSigningOut(false)
      toast.error('La déconnexion a échoué. Réessayez.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compte</CardTitle>
        <CardDescription>
          Gérez votre session sur cet appareil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Se déconnecter</p>
            <p className="mt-0.5 text-sm text-fg-muted">
              Vous reviendrez à la page d’accueil. Vos données restent en
              sécurité.
            </p>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <LogOut className="size-4" />
                Se déconnecter
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Se déconnecter de Filon ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Votre session sur cet appareil sera fermée. Vous pourrez vous
                  reconnecter à tout moment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={signingOut}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    void onSignOut()
                  }}
                  disabled={signingOut}
                >
                  {signingOut && <Loader2 className="size-4 animate-spin" />}
                  Se déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
