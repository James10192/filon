import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import { handlePlanLimit } from '~/lib/billing/upsell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  OpportunityForm,
  type OpportunityFormSubmit,
} from './opportunity-form'

/** Dialog de création d'une opportunité. Déclenché par un bouton primaire. */
export function OpportunityFormDialog({
  trigger,
}: {
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const create = useMutation(api.opportunities.create)

  async function handleSubmit(values: OpportunityFormSubmit) {
    setPending(true)
    try {
      // Construction dynamique : aucun champ undefined transmis à Convex.
      const args: Record<string, unknown> = {
        title: values.title,
        type: values.type,
        stage: values.stage,
        targetType: values.targetType,
        tags: values.tags,
      }
      if (values.companyId) args.companyId = values.companyId
      if (values.contactId) args.contactId = values.contactId
      if (values.source) args.source = values.source
      if (values.sourceChannel) args.sourceChannel = values.sourceChannel
      if (values.sourceDetail) args.sourceDetail = values.sourceDetail
      if (values.url) args.url = values.url
      if (values.location) args.location = values.location
      if (values.compensation) args.compensation = values.compensation
      if (values.deadline) args.deadline = values.deadline
      if (values.nextActionAt) args.nextActionAt = values.nextActionAt
      if (values.description) args.description = values.description

      await create(args as Parameters<typeof create>[0])
      toast.success(m.opp_added())
      setOpen(false)
    } catch (error) {
      if (!handlePlanLimit(error)) {
        toast.error(m.opp_add_error())
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            {m.opp_add_opportunity()}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.opp_add_opportunity()}</DialogTitle>
          <DialogDescription>
            {m.opp_add_dialog_desc()}
          </DialogDescription>
        </DialogHeader>
        <OpportunityForm
          submitLabel={m.opp_add()}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          pending={pending}
        />
      </DialogContent>
    </Dialog>
  )
}
