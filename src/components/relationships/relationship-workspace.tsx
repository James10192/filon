import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { BriefcaseBusiness, Building2, CirclePlus, Contact, LockKeyhole } from 'lucide-react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { PageToolbar } from '~/components/app/page-toolbar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

const ACTIVE_STAGES = new Set(['lead', 'contacted', 'applied', 'interview', 'negotiation'])

export function RelationshipWorkspace() {
  const relations = useQuery(api.domain.relationships.list)
  const contacts = useQuery(api.contacts.list, {})
  const companies = useQuery(api.companies.list, {})
  const needs = useQuery(api.domain.needs.list)
  const opportunities = useQuery(api.opportunities.list, {})
  const createRelationship = useMutation(api.domain.relationships.createRelationship)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!relations || !contacts || !companies || !needs || !opportunities) {
    return <RelationshipSkeleton />
  }

  const relation = relations.find((item) => item._id === selectedId) ?? relations[0]
  const contactById = new Map(contacts.map((item) => [item._id, item]))
  const companyById = new Map(companies.map((item) => [item._id, item]))

  async function create() {
    if (!label.trim() || !target) {
      setError('Nommez la relation et choisissez un contact ou une entreprise.')
      return
    }
    const [targetType, targetId] = target.split(':')
    const args: {
      label: string
      kind: 'prospect'
      contactId?: Id<'contacts'>
      companyId?: Id<'companies'>
    } = { label: label.trim(), kind: 'prospect' }
    if (targetType === 'contact') args.contactId = targetId as Id<'contacts'>
    if (targetType === 'company') args.companyId = targetId as Id<'companies'>
    setSaving(true)
    try {
      const id = await createRelationship(args)
      setSelectedId(id)
      setLabel('')
      setTarget('')
      setError('')
      setCreating(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La relation n’a pas pu être créée.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Relations"
        subtitle="Le contexte utile, la prochaine action et les deals liés au même endroit."
        actions={
          <Button onClick={() => setCreating((value) => !value)}>
            <CirclePlus />
            Nouvelle relation
          </Button>
        }
      />

      {creating && (
        <section className="mb-5 border-b border-border bg-surface pb-5" aria-label="Créer une relation">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)_auto]">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nom de la relation" autoFocus />
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Contact ou entreprise" /></SelectTrigger>
              <SelectContent>
                {contacts.map((item) => <SelectItem key={item._id} value={`contact:${item._id}`}>{item.name}</SelectItem>)}
                {companies.map((item) => <SelectItem key={item._id} value={`company:${item._id}`}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving}>{saving ? 'Création…' : 'Créer'}</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            </div>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        </section>
      )}

      {relations.length === 0 ? (
        <EmptyRelations onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid min-h-[32rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface lg:grid-cols-[19rem_minmax(0,1fr)]">
          <nav className="border-b border-border bg-surface-2/45 lg:border-b-0 lg:border-r" aria-label="Liste des relations">
            {relations.map((item) => {
              const active = item._id === relation?._id
              const contact = item.contactId ? contactById.get(item.contactId) : null
              const company = item.companyId ? companyById.get(item.companyId) : contact?.companyId ? companyById.get(contact.companyId) : null
              return (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => setSelectedId(item._id)}
                  className={`min-h-20 w-full border-b border-border px-4 py-3 text-left transition-colors ${active ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2'}`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{contact?.name ?? company?.name ?? 'Cible à préciser'}</span>
                </button>
              )
            })}
          </nav>
          {relation && (
            <RelationshipDetail
              relation={relation}
              contact={relation.contactId ? contactById.get(relation.contactId) : null}
              company={relation.companyId ? companyById.get(relation.companyId) : null}
              needs={needs.filter((item) => item.relationshipId === relation._id)}
              deals={opportunities.filter((item) => item.relationshipId === relation._id && ACTIVE_STAGES.has(item.stage))}
            />
          )}
        </div>
      )}
    </div>
  )
}

function RelationshipDetail({ relation, contact, company, needs, deals }: {
  relation: Doc<'relationships'>
  contact: Doc<'contacts'> | null | undefined
  company: Doc<'companies'> | null | undefined
  needs: Array<Doc<'needs'> & { latest: Doc<'needVersions'> | null }>
  deals: Doc<'opportunities'>[]
}) {
  return (
    <article className="p-5 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-fg-muted"><LockKeyhole className="size-4" />{relation.visibility === 'private' ? 'Contexte privé' : 'Contexte partagé'}</div>
          <h2 className="mt-2 text-balance text-xl font-semibold text-fg">{relation.label}</h2>
          <p className="mt-1 text-pretty text-sm text-fg-muted">{contact?.name ?? company?.name ?? 'Relation sans cible'}{contact?.role ? ` · ${contact.role}` : ''}</p>
        </div>
        <span className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-surface-2 px-3 text-xs font-medium text-fg-muted">{relation.kind}</span>
      </header>
      <div className="grid gap-8 py-6 md:grid-cols-2">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg"><Contact className="size-4 text-accent" />Besoins suivis</h3>
          {needs.length ? <ul className="mt-3 divide-y divide-border">{needs.map((need) => <li key={need._id} className="py-3"><p className="text-sm font-medium text-fg">{need.title}</p><p className="mt-1 text-xs text-fg-muted">Version {need.latestVersion} · {need.status}</p></li>)}</ul> : <p className="mt-3 text-sm text-fg-muted">Aucun besoin formalisé.</p>}
        </section>
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg"><BriefcaseBusiness className="size-4 text-accent" />Deals actifs</h3>
          {deals.length ? <ul className="mt-3 divide-y divide-border">{deals.map((deal) => <li key={deal._id} className="flex items-center justify-between gap-3 py-3"><span className="text-sm font-medium text-fg">{deal.title}</span><span className="assay text-xs text-fg-muted">{deal.stage}</span></li>)}</ul> : <p className="mt-3 text-sm text-fg-muted">Aucun deal ouvert. Qualifiez d’abord le besoin.</p>}
        </section>
      </div>
      <footer className="flex items-center gap-2 border-t border-border pt-5 text-xs text-fg-subtle"><Building2 className="size-4" />Mis à jour le <time className="assay">{new Intl.DateTimeFormat('fr-FR').format(relation.updatedAt)}</time></footer>
    </article>
  )
}

function EmptyRelations({ onCreate }: { onCreate: () => void }) {
  return <section className="border border-dashed border-border px-6 py-14 text-center"><Contact className="mx-auto size-7 text-fg-subtle" /><h2 className="mt-4 text-balance font-semibold text-fg">Commencez par une relation utile</h2><p className="mx-auto mt-2 max-w-md text-pretty text-sm text-fg-muted">Rattachez un contact ou une entreprise pour conserver besoins, décisions et deals dans un même contexte.</p><Button className="mt-5" onClick={onCreate}>Créer une relation</Button></section>
}

function RelationshipSkeleton() {
  return <div className="flex flex-col"><PageToolbar title="Relations" subtitle="Chargement du contexte…" /><div className="grid gap-4 lg:grid-cols-[19rem_1fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>
}
