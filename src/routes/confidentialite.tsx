import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, LegalSection } from '~/components/marketing/legal-page'
import { CONTACT, DATA_PROCESSORS } from '~/lib/contact'

export const Route = createFileRoute('/confidentialite')({
  component: ConfidentialitePage,
  head: () => ({
    meta: [
      { title: 'Filon · Politique de confidentialité' },
      {
        name: 'description',
        content:
          'Politique de confidentialité de Filon : données collectées, finalités, sous-traitants et vos droits.',
      },
    ],
  }),
})

function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="6 août 2026">
      <LegalSection title="Données que nous collectons">
        <p>Nous traitons uniquement les données nécessaires au service :</p>
        <ul>
          <li>Données de compte : nom, adresse e-mail, mot de passe (chiffré).</li>
          <li>
            Données d’usage : opportunités, propositions, contacts et documents
            que vous créez dans l’application.
          </li>
          <li>
            Données de facturation : palier d’abonnement et références de
            transaction (le numéro de carte n’est jamais stocké par Filon, il est
            traité par Paystack).
          </li>
          <li>
            Données de mesure d’audience : pages consultées et actions dans
            l’application, pour améliorer le produit.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalités et base légale">
        <p>
          Ces données servent à fournir le service, gérer votre abonnement,
          assurer la sécurité du compte et améliorer le produit. Le traitement
          repose sur l’exécution du contrat qui nous lie et sur notre intérêt
          légitime à faire fonctionner et sécuriser Filon.
        </p>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <p>
          Pour fonctionner, Filon s’appuie sur des prestataires qui traitent
          certaines données pour notre compte :
        </p>
        <ul>
          {DATA_PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong className="text-fg">{p.name}</strong> — {p.role}
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. À la
          fermeture du compte, elles sont supprimées ou anonymisées, sauf
          obligation légale de conservation (par exemple comptable).
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, de suppression et
          de portabilité de vos données, ainsi que d’un droit d’opposition. Pour
          l’exercer, écrivez à{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative à vos données :{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
