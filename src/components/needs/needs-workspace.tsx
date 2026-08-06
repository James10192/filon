import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, FileClock, Pencil, Plus, Save } from 'lucide-react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { PageToolbar } from '~/components/app/page-toolbar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'

type NeedRow = Doc<'needs'> & { latest: Doc<'needVersions'> | null }

export function NeedsWorkspace() {
  const needs = useQuery(api.domain.needs.list)
  const upsert = useMutation(api.domain.needs.upsertNeedWithVersion)
  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [editing, setEditing] = useState<Id<'needs'> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!needs) return <NeedsSkeleton />

  function beginEdit(need: NeedRow) {
    setEditing(need._id)
    setTitle(need.title)
    setStatement(need.latest?.statement ?? need.title)
    setError('')
  }

  async function save() {
    if (!title.trim() || !statement.trim()) {
      setError('Donnez un titre et une formulation précise au besoin.')
      return
    }
    const args: {
      needId?: Id<'needs'>
      title: string
      statement: string
      priority: 'medium'
    } = { title: title.trim(), statement: statement.trim(), priority: 'medium' }
    if (editing) args.needId = editing
    setSaving(true)
    try {
      await upsert(args)
      setTitle('')
      setStatement('')
      setEditing(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le besoin n’a pas pu être enregistré.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageToolbar title="Besoins" subtitle="Une formulation versionnée, reliée aux preuves et aux décisions." />
      <section className="border-b border-border bg-surface pb-5" aria-label={editing ? 'Modifier le besoin' : 'Créer un besoin'}>
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre du besoin" />
          <Textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Formulation précise, résultat attendu et contexte utile" className="min-h-11 resize-y" />
          <div className="flex items-start gap-2">
            <Button onClick={save} disabled={saving}>{editing ? <Save /> : <Plus />}{saving ? 'Enregistrement…' : editing ? 'Nouvelle version' : 'Ajouter'}</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(null); setTitle(''); setStatement('') }}>Annuler</Button>}
          </div>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      {needs.length === 0 ? (
        <section className="border border-dashed border-border px-6 py-14 text-center"><FileClock className="mx-auto size-7 text-fg-subtle" /><h2 className="mt-4 text-balance font-semibold text-fg">Aucun besoin formalisé</h2><p className="mx-auto mt-2 max-w-md text-pretty text-sm text-fg-muted">Commencez par le résultat attendu. Filon conservera chaque évolution au lieu d’écraser le contexte.</p></section>
      ) : (
        <section className="divide-y divide-border border-x border-b border-border bg-surface" aria-label="Besoins versionnés">
          {needs.map((need) => <NeedRowItem key={need._id} need={need} onEdit={() => beginEdit(need)} />)}
        </section>
      )}
    </div>
  )
}

function NeedRowItem({ need, onEdit }: { need: NeedRow; onEdit: () => void }) {
  const validated = need.status === 'validated'
  return (
    <article className="grid gap-4 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:px-5">
      <span className={`mt-0.5 flex size-9 items-center justify-center rounded-[var(--radius)] ${validated ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{validated ? <Check className="size-4" /> : <FileClock className="size-4" />}</span>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-balance font-semibold text-fg">{need.title}</h2><span className="assay rounded-[var(--radius-sm)] bg-surface-2 px-2 py-1 text-[11px] text-fg-muted">v{need.latestVersion}</span></div><p className="mt-1 max-w-3xl text-pretty text-sm text-fg-muted">{need.latest?.statement ?? 'Formulation à compléter'}</p><p className="assay-meta mt-2">Mis à jour {new Intl.DateTimeFormat('fr-FR').format(need.updatedAt)}</p></div>
      <Button variant="outline" onClick={onEdit}><Pencil />Modifier</Button>
    </article>
  )
}

function NeedsSkeleton() {
  return <div className="flex flex-col"><PageToolbar title="Besoins" subtitle="Chargement des versions…" /><Skeleton className="h-20" /><div className="mt-5 space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div></div>
}
