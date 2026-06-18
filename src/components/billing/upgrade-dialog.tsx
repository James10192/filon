import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import {
  FEATURES,
  requiredPlanLabel,
  type FeatureId,
} from '~/lib/billing/conversion'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

/**
 * Surface d'upgrade unique et focalisée (le SEUL modal de la couche conversion,
 * hors mur dur). Ouverte au clic sur une fonctionnalité verrouillée : elle
 * présente la valeur de la fonctionnalité, le palier requis, et un CTA unique
 * vers /app/tarifs. Pas de scarcité, pas de rouge, pas de pression.
 */
export function UpgradeDialog({
  feature,
  open,
  onOpenChange,
}: {
  feature: FeatureId | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const copy = feature ? FEATURES[feature] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
              <Sparkles className="size-4" />
            </span>
            {copy && <Badge variant="accent">{requiredPlanLabel(copy.requires)}</Badge>}
          </div>
          <DialogTitle>{copy?.title ?? m.app_upgrade_generic_title()}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {copy?.value ?? m.app_upgrade_generic_desc()}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start">
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link to="/app/tarifs">
              <Sparkles className="size-4" />
              {m.app_see_pricing()}
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {m.app_later()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
