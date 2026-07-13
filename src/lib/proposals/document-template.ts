export type ProposalDocumentLanguage = 'fr' | 'en'
export type ProposalDocumentType = 'devis' | 'proforma_hors_fne'

export type ProposalDocumentModel = {
  documentType: ProposalDocumentType
  documentNumber?: string
  revision?: number
  draft: boolean
  language: ProposalDocumentLanguage
  brandMode: 'cobranded' | 'white_label'
  issuedAt: number
  title: string
  validUntil?: string
  issuer: {
    name: string
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
  recipient: {
    name: string
    attention?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    taxId?: string
  }
  lines: Array<{ label: string; description?: string; quantity: number; unitPrice: number }>
  currency: string
  discount?: { type: 'fixed' | 'percent'; value: number }
  taxes?: Array<{ label: string; rate: number }>
  depositAmount?: number
  pitch?: string
  terms?: string
  clientNote?: string
}

type Labels = {
  document: string
  issued: string
  validUntil: string
  issuer: string
  client: string
  description: string
  quantity: string
  unitPrice: string
  total: string
  subtotal: string
  discount: string
  taxes: string
  deposit: string
  balance: string
  terms: string
  payment: string
  note: string
  signature: string
  draft: string
  page: string
  generatedBy: string
  fneNotice: string
}

const FR: Labels = {
  document: 'DEVIS', issued: 'Émis le', validUntil: 'Valable jusqu’au', issuer: 'ÉMETTEUR', client: 'CLIENT',
  description: 'Désignation', quantity: 'Qté', unitPrice: 'Prix unitaire', total: 'Total', subtotal: 'Sous-total',
  discount: 'Remise', taxes: 'Taxes', deposit: 'Acompte', balance: 'Solde à payer', terms: 'Conditions',
  payment: 'Règlement', note: 'Note', signature: 'Signature', draft: 'BROUILLON', page: 'Page',
  generatedBy: 'Document préparé avec Filon',
  fneNotice: 'Document hors FNE, non certifié par la plateforme FNE, à usage commercial ou de suivi interne selon le contexte.',
}

const EN: Labels = {
  document: 'QUOTATION', issued: 'Issued on', validUntil: 'Valid until', issuer: 'ISSUER', client: 'CLIENT',
  description: 'Description', quantity: 'Qty', unitPrice: 'Unit price', total: 'Total', subtotal: 'Subtotal',
  discount: 'Discount', taxes: 'Taxes', deposit: 'Deposit', balance: 'Balance due', terms: 'Terms',
  payment: 'Payment', note: 'Note', signature: 'Signature', draft: 'DRAFT', page: 'Page',
  generatedBy: 'Document prepared with Filon',
  fneNotice: 'Non-FNE document, not certified by the FNE platform. For commercial or internal follow-up use according to the context.',
}

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char] ?? char)
}

function money(value: number, currency: string, language: ProposalDocumentLanguage) {
  const number = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    minimumFractionDigits: currency === 'XOF' ? 0 : 2,
  }).format(value).replace(/[\u00a0\u202f]/g, ' ')
  return currency === 'XOF' ? `${number} F CFA` : `${number} ${currency}`
}

function date(value: number | string | undefined, language: ProposalDocumentLanguage) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(parsed)
}

function details(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim())).map(escapeHtml).join('<br>')
}

export function calculateProposalTotals(model: ProposalDocumentModel) {
  const subtotal = model.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const discountAmount = model.discount
    ? Math.min(subtotal, model.discount.type === 'percent' ? subtotal * model.discount.value / 100 : model.discount.value)
    : 0
  const taxable = subtotal - discountAmount
  const taxAmount = (model.taxes ?? []).reduce((sum, tax) => sum + taxable * tax.rate / 100, 0)
  const total = taxable + taxAmount
  const deposit = Math.min(Math.max(model.depositAmount ?? 0, 0), total)
  return { subtotal, discountAmount, taxable, taxAmount, total, deposit, balance: total - deposit }
}

export function documentFilename(model: ProposalDocumentModel) {
  const type = model.documentType === 'devis' ? 'devis' : 'proforma'
  const safeTitle = model.title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'
  const number = model.documentNumber?.toLowerCase() ?? 'brouillon'
  const revision = model.revision ? `-r${String(model.revision).padStart(2, '0')}` : ''
  return `filon-${type}-${number}${revision}-${safeTitle}.pdf`
}

export function renderProposalDocumentHtml(
  model: ProposalDocumentModel,
  options?: { baseUrl?: string },
): string {
  const labels = model.language === 'fr' ? FR : EN
  const totals = calculateProposalTotals(model)
  const accent = /^#[0-9a-f]{6}$/i.test(model.issuer.accentColor ?? '') ? model.issuer.accentColor : '#4f46e5'
  const typeTitle = model.documentType === 'devis' ? labels.document : model.language === 'fr' ? 'FACTURE PROFORMA HORS FNE' : 'NON-FNE PROFORMA INVOICE'
  const issuerMeta = details([
    model.issuer.email, model.issuer.phone,
    [model.issuer.address, model.issuer.city, model.issuer.country].filter(Boolean).join(', '),
    model.issuer.website,
    model.issuer.rccm ? `RCCM: ${model.issuer.rccm}` : undefined,
    model.issuer.taxId ? `NCC: ${model.issuer.taxId}` : undefined,
  ])
  const recipientMeta = details([
    model.recipient.attention,
    model.recipient.email,
    model.recipient.phone,
    [model.recipient.address, model.recipient.city, model.recipient.country].filter(Boolean).join(', '),
    model.recipient.taxId ? `NCC: ${model.recipient.taxId}` : undefined,
  ])
  const rows = model.lines.map((line) => `<tr>
    <td><strong>${escapeHtml(line.label)}</strong>${line.description ? `<span>${escapeHtml(line.description)}</span>` : ''}</td>
    <td class="num">${escapeHtml(line.quantity)}</td><td class="num">${escapeHtml(money(line.unitPrice, model.currency, model.language))}</td>
    <td class="num strong">${escapeHtml(money(line.quantity * line.unitPrice, model.currency, model.language))}</td>
  </tr>`).join('')
  const taxRows = (model.taxes ?? []).map((tax) => `<div class="total-row"><span>${escapeHtml(`${labels.taxes} · ${tax.label} (${tax.rate}%)`)}</span><strong>${escapeHtml(money((totals.taxable * tax.rate) / 100, model.currency, model.language))}</strong></div>`).join('')
  const logo = model.issuer.logoUrl ? `<img class="logo-image" src="${escapeHtml(model.issuer.logoUrl)}" alt="${escapeHtml(model.issuer.name)}">` : `<span class="monogram">${escapeHtml(model.issuer.name.slice(0, 2).toUpperCase())}</span>`
  const notice = model.documentType === 'proforma_hors_fne' ? model.issuer.legalNote || labels.fneNotice : model.language === 'fr' ? 'Ce devis ne constitue pas une facture certifiée FNE.' : 'This quotation is not an FNE-certified invoice.'
  const brand = model.brandMode === 'cobranded' ? `<span class="filon-mark">${labels.generatedBy}</span>` : ''

  return `<!doctype html><html lang="${model.language}"><head><meta charset="utf-8">${options?.baseUrl ? `<base href="${escapeHtml(options.baseUrl)}">` : ''}<title>${escapeHtml(typeTitle)}</title><style>${proposalDocumentFontFaces}
  @page { size: A4; margin: 14mm 16mm 20mm; }
  :root { --accent:${accent}; --ink:#18181b; --muted:#52525b; --line:#e4e4e7; --paper:#fff; --soft:#f8fafc; }
  * { box-sizing:border-box; } body { margin:0; color:var(--ink); background:var(--paper); font-family:'Hanken Grotesk',Arial,sans-serif; font-size:10.3pt; line-height:1.45; -webkit-font-smoothing:antialiased; }
  .sheet { position:relative; } .draft { position:fixed; inset:35% 0 auto; text-align:center; transform:rotate(-25deg); color:rgba(79,70,229,.11); font:700 54pt/1 Arial,sans-serif; letter-spacing:.08em; pointer-events:none; z-index:-1; }
  .topline { height:4px; background:var(--accent); margin-bottom:13mm; } .head { display:flex; justify-content:space-between; gap:15mm; align-items:flex-start; margin-bottom:11mm; }
  .brand { display:flex; gap:10px; min-width:0; } .logo { width:43px; height:43px; flex:0 0 43px; display:grid; place-items:center; border:1px solid color-mix(in srgb,var(--accent) 35%,white); border-radius:8px; overflow:hidden; color:var(--accent); background:#fff; } .logo-image { display:block; width:100%; height:100%; object-fit:contain; padding:4px; } .monogram { font-weight:750; font-size:12pt; }
  .issuer-name { font-size:15pt; font-weight:750; line-height:1.15; } .meta { color:var(--muted); font-size:8.7pt; margin-top:3px; } .doc-meta { text-align:right; } .doc-title { font-size:18pt; line-height:1.05; font-weight:800; letter-spacing:.01em; } .doc-number { margin-top:5px; font-family:'JetBrains Mono',monospace; font-size:8.5pt; color:var(--muted); }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin-bottom:9mm; } .party { border-top:1px solid var(--line); padding-top:4mm; min-height:31mm; } .eyebrow { color:var(--accent); font:700 7.4pt/1 'JetBrains Mono',monospace; letter-spacing:.1em; } .party-name { margin-top:5px; font-weight:750; font-size:11pt; } .party .meta { margin-top:3px; }
  .subject { border-left:3px solid var(--accent); background:var(--soft); padding:4mm 5mm; margin:0 0 8mm; break-inside:avoid; } .subject h2 { font-size:10pt; margin:0 0 1.5mm; } .subject p { margin:0; color:var(--muted); white-space:pre-wrap; }
  table { width:100%; border-collapse:collapse; font-size:9pt; } thead { display:table-header-group; } th { padding:3mm 2.5mm; background:var(--ink); color:#fff; text-align:left; font-size:7.8pt; letter-spacing:.04em; text-transform:uppercase; } th.num, td.num { text-align:right; } td { padding:3mm 2.5mm; border-bottom:1px solid var(--line); vertical-align:top; } td span { display:block; margin-top:1mm; color:var(--muted); font-size:8.3pt; } .strong { font-family:'JetBrains Mono',monospace; }
  .bottom { display:grid; grid-template-columns:minmax(0,1fr) 66mm; gap:10mm; margin-top:9mm; break-inside:avoid; } .blocks { display:grid; gap:6mm; } .block { border-top:1px solid var(--line); padding-top:3mm; } .block h3 { margin:0 0 2mm; font-size:9pt; } .block p { margin:0; color:var(--muted); white-space:pre-wrap; font-size:8.8pt; }
  .totals { border:1px solid var(--line); padding:4mm; align-self:start; } .total-row { display:flex; justify-content:space-between; gap:8mm; padding:1.4mm 0; color:var(--muted); font-size:8.9pt; } .total-row strong { color:var(--ink); font-family:'JetBrains Mono',monospace; font-weight:650; } .grand { border-top:1px solid var(--ink); margin-top:2mm; padding-top:3mm; font-size:10.5pt; color:var(--ink); } .grand strong { color:var(--accent); font-size:12pt; }
  footer { margin-top:11mm; padding-top:4mm; border-top:1px solid var(--line); display:flex; justify-content:space-between; gap:8mm; color:var(--muted); font-size:7.7pt; } footer p { margin:0; max-width:128mm; } .filon-mark { font:600 7.4pt/1 'JetBrains Mono',monospace; white-space:nowrap; }
  @media print { body { background:#fff; } .sheet { width:auto; } } @media screen { body { background:#e4e4e7; padding:24px; } .sheet { width:210mm; min-height:297mm; margin:auto; padding:14mm 16mm 20mm; background:#fff; box-shadow:0 16px 42px rgba(24,24,27,.14); } }
  </style></head><body><main class="sheet">${model.draft ? `<div class="draft">${labels.draft}</div>` : ''}<div class="topline"></div>
  <header class="head"><div class="brand"><div class="logo">${logo}</div><div><div class="issuer-name">${escapeHtml(model.issuer.name)}</div><div class="meta">${issuerMeta}</div></div></div><div class="doc-meta"><div class="doc-title">${escapeHtml(typeTitle)}</div><div class="doc-number">${escapeHtml(model.documentNumber ?? labels.draft)}${model.revision ? ` · R${String(model.revision).padStart(2, '0')}` : ''}</div><div class="meta">${labels.issued}: ${escapeHtml(date(model.issuedAt, model.language))}${model.validUntil ? `<br>${labels.validUntil}: ${escapeHtml(date(model.validUntil, model.language))}` : ''}</div></div></header>
  <section class="parties"><div class="party"><div class="eyebrow">${labels.issuer}</div><div class="party-name">${escapeHtml(model.issuer.name)}</div><div class="meta">${issuerMeta}</div></div><div class="party"><div class="eyebrow">${labels.client}</div><div class="party-name">${escapeHtml(model.recipient.name)}</div><div class="meta">${recipientMeta}</div></div></section>
  ${model.pitch ? `<section class="subject"><h2>${escapeHtml(model.title)}</h2><p>${escapeHtml(model.pitch)}</p></section>` : ''}
  <table><thead><tr><th>${labels.description}</th><th class="num">${labels.quantity}</th><th class="num">${labels.unitPrice}</th><th class="num">${labels.total}</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="bottom"><div class="blocks">${model.terms || model.issuer.paymentTerms ? `<div class="block"><h3>${labels.terms}</h3><p>${escapeHtml(model.terms || model.issuer.paymentTerms || '')}</p></div>` : ''}${model.issuer.paymentDetails ? `<div class="block"><h3>${labels.payment}</h3><p>${escapeHtml(model.issuer.paymentDetails)}</p></div>` : ''}${model.clientNote ? `<div class="block"><h3>${labels.note}</h3><p>${escapeHtml(model.clientNote)}</p></div>` : ''}${model.issuer.signature ? `<div class="block"><h3>${labels.signature}</h3><p>${escapeHtml(model.issuer.signature)}</p></div>` : ''}</div>
  <aside class="totals"><div class="total-row"><span>${labels.subtotal}</span><strong>${escapeHtml(money(totals.subtotal, model.currency, model.language))}</strong></div>${totals.discountAmount ? `<div class="total-row"><span>${labels.discount}</span><strong>− ${escapeHtml(money(totals.discountAmount, model.currency, model.language))}</strong></div>` : ''}${taxRows}<div class="total-row grand"><span>${labels.total}</span><strong>${escapeHtml(money(totals.total, model.currency, model.language))}</strong></div>${totals.deposit ? `<div class="total-row"><span>${labels.deposit}</span><strong>${escapeHtml(money(totals.deposit, model.currency, model.language))}</strong></div><div class="total-row"><span>${labels.balance}</span><strong>${escapeHtml(money(totals.balance, model.currency, model.language))}</strong></div>` : ''}</aside></section>
  <footer><p>${escapeHtml(notice)}</p>${brand}</footer></main></body></html>`
}
import { proposalDocumentFontFaces } from './document-fonts'
