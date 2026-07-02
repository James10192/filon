import {
  CheckCircle2,
  Clock3,
  Database,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

export type RichContent = {
  screenshotTitle: string
  screenshotSubtitle: string
  screenshotStatus: string
  screenshotSrc: string
  screenshotAlt: string
  sidebarItems: string[]
  metricCards: Array<{ label: string; value: string }>
  tableRows: Array<{ label: string; status: string; meta: string }>
  workflow: string[]
  diagramDefinition: string
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
        <WorkflowDiagram
          definition={content.diagramDefinition}
          fallbackSteps={content.workflow}
        />
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
          app.filon-xi.vercel.app
        </span>
      </div>
      <div className="bg-bg p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-fg">
              {content.screenshotTitle}
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-fg-muted">
              {content.screenshotSubtitle}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
            <CheckCircle2 className="size-3.5" />
            {content.screenshotStatus}
          </span>
        </div>
        <img
          src={content.screenshotSrc}
          alt={content.screenshotAlt}
          className="aspect-[16/10] w-full rounded-[var(--radius-sm)] border border-border bg-surface object-cover object-top"
          loading="lazy"
        />
      </div>
    </div>
  )
}

function WorkflowDiagram({
  definition,
  fallbackSteps,
}: {
  definition: string
  fallbackSteps: string[]
}) {
  const reactId = useId()
  const diagramId = useMemo(
    () => `filon-docs-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId],
  )
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function renderDiagram() {
      try {
        const { createMermaidPlugin } = await import('@streamdown/mermaid')
        const plugin = createMermaidPlugin({
          config: {
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'base',
            themeVariables: {
              primaryColor: '#eef2ff',
              primaryTextColor: '#111827',
              primaryBorderColor: '#4f46e5',
              lineColor: '#4f46e5',
              fontFamily: 'Hanken Grotesk, Inter, sans-serif',
            },
          },
        })
        const mermaid = plugin.getMermaid()
        const result = await mermaid.render(diagramId, definition)

        if (mounted) {
          setSvg(result.svg)
        }
      } catch {
        if (mounted) {
          setSvg(null)
        }
      }
    }

    void renderDiagram()

    return () => {
      mounted = false
    }
  }, [definition, diagramId])

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      {svg ? (
        <div
          className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:font-sans"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fallbackSteps.map((step, index) => (
            <li
              key={step}
              className="rounded-[var(--radius)] border border-border bg-bg p-4"
            >
              <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-snug text-fg">{step}</p>
            </li>
          ))}
        </ol>
      )}
      <pre className="sr-only">{definition}</pre>
    </div>
  )
}
