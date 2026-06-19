import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Building2, Loader2, User } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ValueCombobox } from '~/components/ui/value-combobox'
import { EntityCombobox } from '~/components/ui/entity-combobox'
import { TagCombobox } from '~/components/ui/tag-combobox'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import {
  PRIORITY_META,
  SOURCE_CHANNELS,
  SOURCE_META,
  STAGES,
  TARGET_TYPES,
  TARGET_TYPE_META,
  TYPE_META,
  type OppType,
  type Priority,
  type SourceChannel,
  type Stage,
  type TargetType,
} from './meta'
import { useStageLabels } from './use-stage-labels'

export type OpportunityFormValues = {
  title: string
  type: OppType
  stage: Stage
  priority?: Priority
  /** Cible suivie : entreprise / particulier / aucune. */
  targetType?: TargetType
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  /** Source libre historique (retro-compat). */
  source?: string
  /** Canal d'origine normalise. */
  sourceChannel?: SourceChannel
  sourceDetail?: string
  url?: string
  location?: string
  compensation?: string
  deadline?: string
  nextActionAt?: string
  tags: string[]
  description?: string
}

export type OpportunityFormSubmit = {
  title: string
  type: OppType
  stage: Stage
  priority: Priority
  targetType: TargetType
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  source?: string
  sourceChannel?: SourceChannel
  sourceDetail?: string
  url?: string
  location?: string
  compensation?: string
  deadline?: string
  nextActionAt?: string
  tags: string[]
  description?: string
}

const TYPE_OPTIONS = Object.entries(TYPE_META) as [
  OppType,
  (typeof TYPE_META)[OppType],
][]

const PRIORITY_OPTIONS = Object.entries(PRIORITY_META) as [
  Priority,
  (typeof PRIORITY_META)[Priority],
][]

const NO_SOURCE = '__none__'

const TARGET_ICONS: Record<TargetType, typeof Building2> = {
  company: Building2,
  person: User,
  none: User,
}

/** Nettoie une string optionnelle : '' -> undefined (jamais d'undefined explicite côté Convex). */
function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Cible initiale : derive de targetType, sinon de la presence d'un id. */
function initialTarget(initial?: Partial<OpportunityFormValues>): TargetType {
  if (initial?.targetType) return initial.targetType
  if (initial?.companyId) return 'company'
  if (initial?.contactId) return 'person'
  return 'none'
}

export function OpportunityForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = m.opp_save(),
  withStage = true,
  pending = false,
}: {
  initial?: Partial<OpportunityFormValues>
  onSubmit: (values: OpportunityFormSubmit) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
  withStage?: boolean
  pending?: boolean
}) {
  const { label: stageLabelOf } = useStageLabels()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<OppType>(initial?.type ?? 'job_offer')
  const [stage, setStage] = useState<Stage>(initial?.stage ?? 'lead')
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? 'medium',
  )
  const [targetType, setTargetType] = useState<TargetType>(
    initialTarget(initial),
  )
  const [companyId, setCompanyId] = useState<string>(
    initial?.companyId ?? '',
  )
  const [contactId, setContactId] = useState<string>(initial?.contactId ?? '')
  const [sourceChannel, setSourceChannel] = useState<string>(
    initial?.sourceChannel ?? NO_SOURCE,
  )
  const [sourceDetail, setSourceDetail] = useState(initial?.sourceDetail ?? '')
  const [source] = useState(initial?.source ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [compensation, setCompensation] = useState(initial?.compensation ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? '')
  const [nextActionAt, setNextActionAt] = useState(
    initial?.nextActionAt?.slice(0, 10) ?? '',
  )
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [description, setDescription] = useState(initial?.description ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)

  const companies = useQuery(api.companies.list, {})
  const contacts = useQuery(api.contacts.list, {})
  const createCompany = useMutation(api.companies.create)
  const createContact = useMutation(api.contacts.create)

  // Suggestions derivees des opportunites existantes (coherence des donnees).
  const existing = useQuery(api.opportunities.list, {})
  const locationSuggestions = useMemo(
    () => (existing ?? []).map((o) => o.location ?? '').filter(Boolean),
    [existing],
  )

  async function handleCreateCompany(name: string) {
    try {
      const id = await createCompany({ name })
      toast.success(m.opp_company_created())
      return id as string
    } catch {
      toast.error(m.opp_company_create_error())
      return null
    }
  }

  async function handleCreateContact(name: string) {
    try {
      const id = await createContact({ name })
      toast.success(m.opp_contact_created())
      return id as string
    } catch {
      toast.error(m.opp_contact_create_error())
      return null
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    if (title.trim().length === 0) {
      setTitleError(m.opp_form_title_required())
      return
    }
    setTitleError(null)

    const values: OpportunityFormSubmit = {
      title: title.trim(),
      type,
      stage,
      priority,
      targetType,
      source: clean(source),
      sourceChannel:
        sourceChannel !== NO_SOURCE
          ? (sourceChannel as SourceChannel)
          : undefined,
      sourceDetail: clean(sourceDetail),
      url: clean(url),
      location: clean(location),
      compensation: clean(compensation),
      deadline: deadline ? deadline : undefined,
      nextActionAt: nextActionAt ? nextActionAt : undefined,
      tags,
      description: clean(description),
    }
    // La cible n'est rattachee que si elle correspond au type choisi.
    if (targetType === 'company' && companyId) {
      values.companyId = companyId as Id<'companies'>
    }
    if (targetType === 'person' && contactId) {
      values.contactId = contactId as Id<'contacts'>
    }
    void onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ---------------------------------------------------------------- */}
      {/* Section : l'essentiel */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-title">{m.opp_form_title_label()}</Label>
          <Input
            id="opp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={m.opp_form_title_placeholder()}
            aria-invalid={titleError ? true : undefined}
            autoFocus
          />
          {titleError && <p className="text-xs text-danger">{titleError}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-type">{m.opp_form_type_label()}</Label>
            <Select value={type} onValueChange={(v) => setType(v as OppType)}>
              <SelectTrigger id="opp-type">
                <SelectValue placeholder={m.opp_form_type_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {withStage && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opp-stage">{m.opp_form_stage_label()}</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger id="opp-stage">
                  <SelectValue placeholder={m.opp_form_stage_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {stageLabelOf(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-priority">{m.opp_col_priority()}</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as Priority)}
            >
              <SelectTrigger id="opp-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Section : Cible */}
      {/* ---------------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-fg">{m.opp_form_target_legend()}</legend>
        <p className="-mt-1 text-xs text-fg-muted">
          {m.opp_form_target_hint()}
        </p>

        <div
          role="radiogroup"
          aria-label={m.opp_form_target_type_aria()}
          className="grid grid-cols-3 gap-2"
        >
          {TARGET_TYPES.map((key) => {
            const meta = TARGET_TYPE_META[key]
            const Icon = TARGET_ICONS[key]
            const active = targetType === key
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTargetType(key)}
                className={cn(
                  'flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{meta.label}</span>
              </button>
            )
          })}
        </div>

        {targetType === 'company' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-company">{m.opp_target_company()}</Label>
            <EntityCombobox
              id="opp-company"
              items={(companies ?? []).map((c) => ({
                value: c._id,
                label: c.name,
              }))}
              value={companyId || '__none__'}
              onChange={(v) => setCompanyId(v === '__none__' ? '' : v)}
              onCreate={handleCreateCompany}
              emptyValue="__none__"
              emptyLabel={m.opp_company_empty()}
              placeholder={m.opp_company_placeholder()}
              searchPlaceholder={m.opp_company_search_placeholder()}
              noResultLabel={m.opp_company_no_result()}
              createLabel={m.opp_company_create_label()}
            />
          </div>
        )}

        {targetType === 'person' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-contact">{m.opp_target_person()}</Label>
            <EntityCombobox
              id="opp-contact"
              items={(contacts ?? []).map((c) => {
                const companyName =
                  'companyName' in c ? c.companyName : undefined
                return {
                  value: c._id,
                  label: companyName ? `${c.name} · ${companyName}` : c.name,
                }
              })}
              value={contactId || '__none__'}
              onChange={(v) => setContactId(v === '__none__' ? '' : v)}
              onCreate={handleCreateContact}
              emptyValue="__none__"
              emptyLabel={m.opp_contact_empty()}
              placeholder={m.opp_contact_placeholder()}
              searchPlaceholder={m.opp_contact_search_placeholder()}
              noResultLabel={m.opp_contact_no_result()}
              createLabel={m.opp_contact_create_label()}
            />
            <p className="text-xs text-fg-subtle">
              {m.opp_contact_hint()}
            </p>
          </div>
        )}
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      {/* Section : Contexte / Source */}
      {/* ---------------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-fg">{m.opp_form_origin_legend()}</legend>
        <p className="-mt-1 text-xs text-fg-muted">
          {m.opp_form_origin_hint()}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-source-channel">{m.opp_form_source_label()}</Label>
            <Select value={sourceChannel} onValueChange={setSourceChannel}>
              <SelectTrigger id="opp-source-channel">
                <SelectValue placeholder={m.opp_form_source_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SOURCE}>{m.opp_form_source_none()}</SelectItem>
                {SOURCE_CHANNELS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SOURCE_META[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-source-detail">{m.opp_form_source_detail_label()}</Label>
            <Input
              id="opp-source-detail"
              value={sourceDetail}
              onChange={(e) => setSourceDetail(e.target.value)}
              placeholder={m.opp_form_source_detail_placeholder()}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-url">{m.opp_form_url_label()}</Label>
          <Input
            id="opp-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            inputMode="url"
          />
        </div>
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      {/* Section : Détails */}
      {/* ---------------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-fg">{m.opp_form_details_legend()}</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-compensation">{m.opp_form_compensation_label()}</Label>
            <Input
              id="opp-compensation"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              placeholder={m.opp_form_compensation_placeholder()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-location">{m.opp_form_location_label()}</Label>
            <ValueCombobox
              id="opp-location"
              value={location}
              onChange={setLocation}
              suggestions={locationSuggestions}
              placeholder={m.opp_form_location_placeholder()}
              searchPlaceholder={m.opp_form_location_search_placeholder()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-next">{m.opp_form_next_action_label()}</Label>
            <Input
              id="opp-next"
              type="date"
              value={nextActionAt}
              onChange={(e) => setNextActionAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-deadline">{m.opp_form_deadline_label()}</Label>
            <Input
              id="opp-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-description">{m.opp_form_notes_label()}</Label>
          <Textarea
            id="opp-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={m.opp_form_notes_placeholder()}
            rows={3}
          />
        </div>
      </fieldset>

      {/* ---------------------------------------------------------------- */}
      {/* Section : Étiquettes */}
      {/* ---------------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-fg">{m.opp_form_tags_legend()}</legend>
        <TagCombobox id="opp-tags" value={tags} onChange={setTags} />
      </fieldset>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {m.opp_cancel()}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
