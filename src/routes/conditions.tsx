import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, LegalSection } from '~/components/marketing/legal-page'
import { CONTACT } from '~/lib/contact'

export const Route = createFileRoute('/conditions')({
  component: ConditionsPage,
  head: () => ({
    meta: [
      { title: 'Filon · Conditions d’utilisation' },
      {
        name: 'description',
        content:
          'Conditions générales d’utilisation du service Filon : compte, abonnement, paiement et responsabilités.',
      },
    ],
  }),
})

function ConditionsPage() {
  return (
    <LegalPage title="Conditions d’utilisation" updatedAt="6 août 2026">
      <LegalSection title="Objet">
        <p>
          Les présentes conditions régissent l’utilisation du service Filon,
          outil de suivi d’opportunités et de propositions. En créant un compte,
          vous les acceptez.
        </p>
      </LegalSection>

      <LegalSection title="Compte">
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et des
          actions effectuées depuis votre compte. Vous vous engagez à fournir des
          informations exactes et à ne pas utiliser le service à des fins
          illicites.
        </p>
      </LegalSection>

      <LegalSection title="Abonnement et paiement">
        <p>
          Filon propose une offre gratuite et des abonnements payants. Les
          paiements sont traités par Paystack, en francs CFA (XOF). Les
          abonnements se renouvellent selon la périodicité choisie ; vous pouvez
          arrêter le renouvellement à tout moment depuis votre compte. Sauf
          disposition légale contraire, les sommes déjà réglées ne sont pas
          remboursées au prorata.
        </p>
      </LegalSection>

      <LegalSection title="Résiliation">
        <p>
          Vous pouvez cesser d’utiliser le service à tout moment. Nous pouvons
          suspendre un compte en cas de manquement aux présentes conditions. Un
          compte suspendu perd l’accès à l’application, ses données étant
          conservées conformément à la politique de confidentialité.
        </p>
      </LegalSection>

      <LegalSection title="Propriété">
        <p>
          Vous restez propriétaire des contenus que vous saisissez. Vous nous
          accordez le droit strictement nécessaire de les héberger et de les
          traiter pour vous fournir le service.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Le service est fourni « en l’état ». Nous mettons tout en œuvre pour en
          assurer la disponibilité et la sécurité, sans pouvoir garantir une
          absence totale d’interruption. Notre responsabilité ne saurait être
          engagée pour les dommages indirects liés à l’utilisation du service.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit ivoirien. Pour toute
          question, contactez{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
