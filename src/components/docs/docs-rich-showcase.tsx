import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { DOCS_ICONS } from './docs-content'
export type RichContent = {
  screenshotTitle: string
  screenshotSubtitle: string
  screenshotStatus: string
  sidebarItems: string[]
  metricCards: Array<{ label: string; value: string }>
  tableRows: Array<{ label: string; status: string; meta: string }>
  workflow: string[]
  proofs: Array<{ title: string; body: string }>
}

export type DocsRichCopy = {
  interfaceKicker: string
  interfacePreview: string
  workflowKicker: string
  workflow: string
  proofsKicker: string
  productProofs: string
}

export function RichDocsShowcase({
  content,
  copy,
}: {
  content: RichContent
  copy: DocsRichCopy
}) {
  return (
    <div className="not-prose mb-10 space-y-8">
      <section id="interface" className="scroll-mt-24">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
              {copy.interfaceKicker}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-fg">
              {copy.interfacePreview}
            </h2>
          </div>
          <span className="hidden rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted sm:inline-flex">
            {content.screenshotStatus}
          </span>
        </div>
        <ProductScreenshot content={content} />
      </section>

      <section id="workflow" className="scroll-mt-24">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
            {copy.workflowKicker}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-fg">{copy.workflow}</h2>
        </div>
        <WorkflowDiagram steps={content.workflow} />
      </section>

      <section id="preuves-produit" className="scroll-mt-24">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
            {copy.proofsKicker}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-fg">
            {copy.productProofs}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {content.proofs.map((proof, index) => {
            const ProofIcon = proofIcons[index] ?? CheckCircle2
            return (
              <div
                key={proof.title}
                className="rounded-[var(--radius)] border border-border bg-surface p-4"
              >
                <ProofIcon className="mb-3 size-5 text-accent" />
                <h3 className="text-sm font-semibold text-fg">{proof.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {proof.body}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const proofIcons = [ShieldCheck, Database, Clock3]

function ProductScreenshot({ content }: { content: RichContent }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span className="ml-3 truncate text-xs font-medium text-fg-muted">
          app.filon.local
        </span>
      </div>
      <div className="grid min-h-[22rem] grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="hidden border-r border-border bg-bg/70 p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
              <DOCS_ICONS.app className="size-4" />
            </span>
            <span className="text-sm font-semibold text-fg">Filon</span>
          </div>
          <div className="space-y-1.5">
            {content.sidebarItems.map((item, index) => (
              <div
                key={item}
                className={cn(
                  'rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium',
                  index === 0
                    ? 'bg-accent-soft text-accent'
                    : 'text-fg-muted',
                )}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-fg">
                {content.screenshotTitle}
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-fg-muted">
                {content.screenshotSubtitle}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              <CheckCircle2 className="size-3.5" />
              {content.screenshotStatus}
            </span>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {content.metricCards.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[var(--radius)] border border-border bg-bg p-3"
              >
                <p className="text-xs text-fg-muted">{metric.label}</p>
                <p className="mt-1 text-xl font-semibold text-fg">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[var(--radius)] border border-border">
            {content.tableRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-3 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {row.label}
                  </p>
                  <p className="mt-1 truncate text-xs text-fg-muted">
                    {row.meta}
                  </p>
                </div>
                <span className="h-fit rounded-[var(--radius-sm)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-muted">
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {steps.map((step, index) => (
          <div key={step} className="contents">
            <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {index + 1}
              </div>
              <p className="text-sm font-semibold leading-snug text-fg">{step}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden items-center justify-center text-fg-subtle md:flex">
                <ArrowRight className="size-5" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-fg-muted">
        <GitBranch className="size-4 shrink-0 text-accent" />
        <span>{steps.join(' · ')}</span>
      </div>
    </div>
  )
}
