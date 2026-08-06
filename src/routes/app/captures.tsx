import { createFileRoute, Link } from '@tanstack/react-router'
import { Radar } from 'lucide-react'
import { PageToolbar } from '~/components/app/page-toolbar'
import { Button } from '~/components/ui/button'
import { RecentCaptures } from '~/components/veille/recent-captures'

export const Route = createFileRoute('/app/captures')({
  component: CapturesPage,
  head: () => ({ meta: [{ title: 'Captures · Filon' }] }),
})

function CapturesPage() {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Captures"
        subtitle="Les signaux entrants à qualifier avant de créer une relation ou un deal."
        actions={
          <Button asChild>
            <Link to="/app/veille">
              <Radar className="size-4" />
              Lancer la veille
            </Link>
          </Button>
        }
      />
      <RecentCaptures />
    </div>
  )
}
