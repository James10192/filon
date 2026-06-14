import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Le Pipeline a fusionné dans l'espace Opportunités unifié. Cette route
 * redirige vers la vue Tableau (kanban) pour préserver les liens existants.
 */
export const Route = createFileRoute('/app/pipeline')({
  beforeLoad: () => {
    throw redirect({
      to: '/app/opportunites',
      search: { view: 'tableau' },
    })
  },
})
