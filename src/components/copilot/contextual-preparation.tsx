import { useQuery } from 'convex/react'
import { anyApi, type FunctionReference } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

type UpcomingAction = {
  label: string
  dueDate: string
}

type CopilotPreparation = {
  opportunity: {
    id: Id<'opportunities'>
    title: string
    stage: string
    type: string
    nextActionAt: string | null
  }
  upcomingActions: UpcomingAction[]
  guardrail: string
}

type CopilotPreparationQuery = FunctionReference<
  'query',
  'public',
  {
    opportunityId: Id<'opportunities'>
  },
  CopilotPreparation
>

type DomainCopilotApi = {
  domain: {
    actions: {
      copilotPreparation: CopilotPreparationQuery
    },
  },
}

const domainApi: DomainCopilotApi =
  'domain' in api
    ? (api as DomainCopilotApi)
    : {
        domain: {
          actions: {
            copilotPreparation: anyApi.domain.actions.copilotPreparation as CopilotPreparationQuery,
          },
        },
      }

export function ContextualPreparation({ opportunityId }: { opportunityId: Id<'opportunities'> }) {
  const context = useQuery(domainApi.domain.actions.copilotPreparation, {
    opportunityId,
  })

  if (!context) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pr\u00e9parer avec Copilot</CardTitle>
        <CardDescription>{context.guardrail}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-medium">{context.opportunity.title}</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {context.upcomingActions.map((item: UpcomingAction) => (
            <li key={`${item.label}-${item.dueDate}`}>
              {item.label}, {item.dueDate}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
