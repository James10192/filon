import { createHash } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { Page } from 'puppeteer-core'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { fetchAuthMutation, fetchAuthQuery } from '~/lib/auth/auth-server'
import { documentFilename, renderProposalDocumentHtml, type ProposalDocumentModel } from '~/lib/proposals/document-template'

const PDF_CONTENT_TYPE = 'application/pdf'
const json = (body: Record<string, string>, status = 200) => Response.json(body, { status })

function documentHash(model: ProposalDocumentModel) {
  const content = { documentType: model.documentType, language: model.language, brandMode: model.brandMode, title: model.title, validUntil: model.validUntil, issuer: model.issuer, recipient: model.recipient, lines: model.lines, currency: model.currency, discount: model.discount, taxes: model.taxes, depositAmount: model.depositAmount, pitch: model.pitch, terms: model.terms, clientNote: model.clientNote }
  return createHash('sha256').update(JSON.stringify(content)).digest('hex')
}

async function waitForAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }) })))
  })
}

export const Route = createFileRoute('/api/propositions/$id/pdf')({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const proposalId = params.id as Id<'proposals'>
        let revisionId: Id<'billingDocumentRevisions'> | null = null
        try {
          const preview = await fetchAuthQuery(api.billingProfiles.proposalPreview, { proposalId })
          if (!preview.canFinalize) return json({ message: 'Les éléments requis du document sont incomplets.' }, 422)
          const previewModel = preview.document as ProposalDocumentModel
          const reservationArgs: { proposalId: Id<'proposals'>; scopeType: 'user' | 'organization'; organizationId?: Id<'organizations'>; documentType: 'devis' | 'proforma_hors_fne'; contentHash: string; snapshot: string; language: 'fr' | 'en'; brandMode: 'cobranded' | 'white_label' } = { proposalId, scopeType: preview.scopeType, documentType: previewModel.documentType, contentHash: documentHash(previewModel), snapshot: JSON.stringify(previewModel), language: previewModel.language, brandMode: previewModel.brandMode }
          if (preview.organizationId) reservationArgs.organizationId = preview.organizationId
          const reservation = await fetchAuthMutation(api.billingProfiles.reserveProposalRevision, reservationArgs)
          revisionId = reservation.revisionId
          if (reservation.url) return json({ url: reservation.url })
          const model: ProposalDocumentModel = { ...previewModel, documentNumber: reservation.documentNumber, revision: reservation.revision, issuedAt: reservation.issuedAt, draft: false }
          const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true })
          let pdf: Uint8Array
          try {
            const page = await browser.newPage()
            await page.setContent(renderProposalDocumentHtml(model, { baseUrl: new URL('/', request.url).toString() }), { waitUntil: 'networkidle0' })
            await waitForAssets(page)
            pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
          } finally { await browser.close() }
          const uploadUrl = await fetchAuthMutation(api.documents.generateUploadUrl, {})
          const uploadResponse = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': PDF_CONTENT_TYPE }, body: pdf })
          if (!uploadResponse.ok) throw new Error('storage_upload_failed')
          const upload = await uploadResponse.json() as { storageId?: Id<'_storage'> }
          if (!upload.storageId) throw new Error('storage_id_missing')
          const finalized = await fetchAuthMutation(api.billingProfiles.finalizeProposalRevision, { revisionId, storageId: upload.storageId, filename: documentFilename(model), size: pdf.byteLength })
          if (!finalized.url) throw new Error('storage_url_missing')
          return json({ url: finalized.url })
        } catch (error) {
          if (revisionId) { try { await fetchAuthMutation(api.billingProfiles.failProposalRevision, { revisionId, message: error instanceof Error ? error.message : 'pdf_generation_failed' }) } catch { /* Preserve the original error for the client. */ } }
          return json({ message: 'La génération du PDF a échoué.' }, 500)
        }
      },
    },
  },
})
