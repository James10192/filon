import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Building2, ImagePlus, Loader2, ReceiptText, Save } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'

type Profile = {
  displayName?: string
  logoStorageId?: Id<'_storage'>
  logoUrl?: string | null
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  taxId?: string
  rccm?: string
  website?: string
  accentColor?: string
  legalNote?: string
  paymentTerms?: string
  paymentDetails?: string
  signature?: string
}

type FormState = Required<
  Pick<
    Profile,
    | 'displayName'
    | 'email'
    | 'phone'
    | 'address'
    | 'city'
    | 'country'
    | 'taxId'
    | 'rccm'
    | 'website'
    | 'accentColor'
    | 'legalNote'
    | 'paymentTerms'
    | 'paymentDetails'
    | 'signature'
  >
> & { logoStorageId?: Id<'_storage'>; logoUrl?: string | null }

type SavePayload = Omit<FormState, 'logoUrl'>

const EMPTY_FORM: FormState = {
  displayName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: "Côte d'Ivoire",
  taxId: '',
  rccm: '',
  website: '',
  accentColor: '#4f46e5',
  legalNote:
    'Document hors FNE, non certifié par la plateforme FNE, à usage commercial ou de suivi interne selon le contexte.',
  paymentTerms: 'Paiement à réception.',
  paymentDetails: '',
  signature: '',
}

export function BillingProfileCard() {
  const billing = useQuery(api.billingProfiles.getMine, {})
  const save = useMutation(api.billingProfiles.upsertMine)

  return (
    <BillingProfileForm
      title="Facturation hors FNE"
      description="Identité personnelle utilisée pour les proformas, devis, factures hors FNE et reçus générés par Filon."
      profile={billing?.solo}
      modeLabel={
        billing?.organizations.length
          ? 'Profil solo, l’organisation reste prioritaire pour les exports partagés'
          : 'Profil solo'
      }
      icon={<ReceiptText className="size-4" />}
      onSave={(payload) => save(payload)}
    />
  )
}

export function OrgBillingProfileCard({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const billing = useQuery(api.billingProfiles.getOrganization, {
    organizationId,
  })
  const save = useMutation(api.billingProfiles.upsertOrganization)

  return (
    <BillingProfileForm
      title="Identité de facturation"
      description="Configuration partagée par l’organisation pour les documents hors FNE émis par les membres."
      profile={billing?.profile}
      modeLabel={
        billing?.canEdit
          ? 'Configuration partagée par l’organisation'
          : 'Lecture seule, réservée aux administrateurs'
      }
      icon={<Building2 className="size-4" />}
      disabled={billing ? !billing.canEdit : true}
      onSave={(payload) => save({ organizationId, ...payload })}
    />
  )
}

function BillingProfileForm({
  title,
  description,
  profile,
  modeLabel,
  icon,
  disabled = false,
  onSave,
}: {
  title: string
  description: string
  profile?: Profile
  modeLabel: string
  icon: React.ReactNode
  disabled?: boolean
  onSave: (payload: SavePayload) => Promise<unknown>
}) {
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      displayName: profile.displayName ?? '',
      logoStorageId: profile.logoStorageId,
      logoUrl: profile.logoUrl,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      country: profile.country ?? "Côte d'Ivoire",
      taxId: profile.taxId ?? '',
      rccm: profile.rccm ?? '',
      website: profile.website ?? '',
      accentColor: profile.accentColor ?? '#4f46e5',
      legalNote: profile.legalNote ?? EMPTY_FORM.legalNote,
      paymentTerms: profile.paymentTerms ?? EMPTY_FORM.paymentTerms,
      paymentDetails: profile.paymentDetails ?? '',
      signature: profile.signature ?? '',
    })
  }, [profile])

  const previewLines = useMemo(
    () =>
      [form.email, form.phone, form.website].filter(
        (value): value is string => Boolean(value),
      ),
    [form.email, form.phone, form.website],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onLogoChange(file: File | undefined) {
    if (!file || disabled) return
    setUploadingLogo(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
      update('logoStorageId', storageId)
      update('logoUrl', URL.createObjectURL(file))
      toast.success('Logo ajouté')
    } catch {
      toast.error("Le logo n'a pas pu être importé.")
    } finally {
      setUploadingLogo(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({
        displayName: form.displayName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        taxId: form.taxId,
        rccm: form.rccm,
        website: form.website,
        accentColor: form.accentColor,
        legalNote: form.legalNote,
        paymentTerms: form.paymentTerms,
        paymentDetails: form.paymentDetails,
        signature: form.signature,
        ...(form.logoStorageId ? { logoStorageId: form.logoStorageId } : {}),
      })
      toast.success('Identité de facturation enregistrée')
    } catch {
      toast.error("L'identité de facturation n'a pas pu être enregistrée.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              {modeLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div className="flex flex-col gap-2">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-[var(--radius)] border bg-surface-2">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="size-full object-contain" />
                ) : (
                  <ReceiptText className="size-7 text-fg-subtle" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploadingLogo}
                asChild
              >
                <label className="cursor-pointer">
                  {uploadingLogo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void onLogoChange(event.target.files?.[0])}
                  />
                </label>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom commercial" value={form.displayName} disabled={disabled} onChange={(v) => update('displayName', v)} />
              <Field label="Email" value={form.email} disabled={disabled} onChange={(v) => update('email', v)} />
              <Field label="Telephone" value={form.phone} disabled={disabled} onChange={(v) => update('phone', v)} />
              <Field label="Site web" value={form.website} disabled={disabled} onChange={(v) => update('website', v)} />
              <Field label="Adresse" value={form.address} disabled={disabled} onChange={(v) => update('address', v)} />
              <Field label="Ville" value={form.city} disabled={disabled} onChange={(v) => update('city', v)} />
              <Field label="Pays" value={form.country} disabled={disabled} onChange={(v) => update('country', v)} />
              <Field label="NCC" value={form.taxId} disabled={disabled} onChange={(v) => update('taxId', v)} />
              <Field label="RCCM" value={form.rccm} disabled={disabled} onChange={(v) => update('rccm', v)} />
              <div className="grid gap-1.5">
                <Label>Couleur accent</Label>
                <Input
                  type="color"
                  value={form.accentColor}
                  disabled={disabled}
                  onChange={(event) => update('accentColor', event.target.value)}
                />
              </div>
            </div>
          </div>

          <LongField label="Mentions" value={form.legalNote} disabled={disabled} onChange={(v) => update('legalNote', v)} />
          <LongField label="Conditions de paiement" value={form.paymentTerms} disabled={disabled} onChange={(v) => update('paymentTerms', v)} />
          <LongField label="Banque ou mobile money" value={form.paymentDetails} disabled={disabled} onChange={(v) => update('paymentDetails', v)} />
          <LongField label="Signature ou cachet texte" value={form.signature} disabled={disabled} onChange={(v) => update('signature', v)} />

          <div className="rounded-[var(--radius)] border bg-surface-2 p-4">
            <div className="flex items-center gap-3">
              <div
                className="size-9 rounded-[var(--radius)]"
                style={{ backgroundColor: form.accentColor }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">
                  {form.displayName || 'Nom commercial'}
                </p>
                <p className="truncate text-xs text-fg-muted">
                  {previewLines.join(' · ') || 'Coordonnées émetteur'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">{form.legalNote}</p>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={disabled || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, '-'), [label])
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function LongField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, '-'), [label])
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        className={cn('min-h-20 resize-y', disabled && 'opacity-80')}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
