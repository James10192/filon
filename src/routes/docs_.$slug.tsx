import { createFileRoute } from '@tanstack/react-router'
import { DocsView } from '~/components/docs/docs-view'

export const Route = createFileRoute('/docs_/$slug')({
  component: DocsSlugPage,
  head: () => ({
    meta: [
      { title: 'Filon · Documentation' },
      {
        name: 'description',
        content:
          'Documentation Filon à jour, en français et en anglais, avec prise en charge du thème clair et sombre.',
      },
    ],
  }),
})

function DocsSlugPage() {
  const { slug } = Route.useParams()
  return <DocsView slug={slug} />
}
