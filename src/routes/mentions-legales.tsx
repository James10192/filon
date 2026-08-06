import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, LegalSection } from '~/components/marketing/legal-page'
import { CONTACT } from '~/lib/contact'

export const Route = createFileRoute('/mentions-legales')({
  component: MentionsLegalesPage,
  head: () => ({
    meta: [
      { title: 'Filon · Mentions légales' },
      {
        name: 'description',
        content: 'Mentions légales du service Filon : éditeur, hébergeur et contact.',
      },
    ],
  }),
})

function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="6 août 2026">
      <LegalSection title="Éditeur du service">
        <p>
          Le service Filon est édité par {CONTACT.editor}, basé à {CONTACT.city}.
          Pour toute question, écrivez à{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>
          Le directeur de la publication est le représentant de {CONTACT.editor}.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          L’application est hébergée par Vercel Inc. (États-Unis). Les données du
          compte sont hébergées par Convex (Convex, Inc., États-Unis). Le
          traitement des paiements est assuré par Paystack.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L’ensemble des contenus, marques et éléments graphiques du service
          Filon sont protégés. Toute reproduction non autorisée est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Support et réclamations :{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ou via{' '}
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
