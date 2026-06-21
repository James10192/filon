import type { api } from '../../../../convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'

/**
 * Type de retour du brief serveur (source unique : `api.copilot.brief`). On
 * dérive les sous-types depuis la sortie réelle de la query pour que les widgets
 * restent toujours alignés sur le serveur (jamais de forme dupliquée à la main).
 */
export type BriefResult = FunctionReturnType<typeof api.copilot.brief.get>

/** Forme « non gated » du brief (palier copilot_max). */
export type BriefData = Extract<BriefResult, { gated: false }>

export type BriefFollowup = BriefData['followups'][number]
export type BriefStalled = BriefData['stalled'][number]
export type BriefTeamFlagged = BriefData['teamPriorities'][number]
export type BriefSignal = BriefData['signals'][number]
export type BriefRank = BriefData['rank']
