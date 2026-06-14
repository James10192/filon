import { STAGE_ORDER } from './pipeline-meta'
import type { Stage } from './pipeline-meta'
import type { Board } from './types'

function emptyBoard(): Board {
  return {
    lead: [],
    contacted: [],
    applied: [],
    interview: [],
    negotiation: [],
    won: [],
    lost: [],
  }
}

/** Recompose un board complet à partir d'une source serveur partielle. */
export function normalizeBoard(source: Board | undefined): Board {
  const base = emptyBoard()
  if (!source) return base
  for (const stage of STAGE_ORDER) {
    base[stage] = source[stage] ? [...source[stage]] : []
  }
  return base
}

/** Localise une carte par identifiant : étape d'appartenance et index. */
export function locate(
  board: Board,
  id: string,
): { stage: Stage; index: number } | null {
  for (const stage of STAGE_ORDER) {
    const index = board[stage].findIndex((o) => o._id === id)
    if (index !== -1) return { stage, index }
  }
  return null
}

/**
 * Résout l'étape ciblée par un identifiant dnd-kit : soit l'id d'une carte
 * (on prend son étape), soit l'id d'une colonne vide (`col:<stage>`).
 */
export function stageOf(board: Board, overId: string): Stage | null {
  if (overId.startsWith('col:')) {
    const stage = overId.slice(4) as Stage
    return STAGE_ORDER.includes(stage) ? stage : null
  }
  return locate(board, overId)?.stage ?? null
}

/**
 * Déplace une carte vers `toStage`, à la position de la carte survolée
 * (`overId`) ou en fin de colonne si `overId` est la colonne elle-même.
 * Renvoie un nouveau board avec les `order` recalculés sur les colonnes touchées.
 */
export function applyMove(
  board: Board,
  activeId: string,
  overId: string,
  toStage: Stage,
): Board {
  const from = locate(board, activeId)
  if (!from) return board
  const card = board[from.stage][from.index]
  if (!card) return board

  const next = normalizeBoard(board)
  // Retire la carte de sa colonne d'origine.
  next[from.stage] = next[from.stage].filter((o) => o._id !== activeId)

  // Index d'insertion dans la colonne cible.
  const dest = next[toStage].filter((o) => o._id !== activeId)
  let insertAt = dest.length
  if (!overId.startsWith('col:')) {
    const overIndex = dest.findIndex((o) => o._id === overId)
    if (overIndex !== -1) insertAt = overIndex
  }

  dest.splice(insertAt, 0, { ...card, stage: toStage })
  next[toStage] = dest.map((o, i) => ({ ...o, order: i }))
  if (from.stage !== toStage) {
    next[from.stage] = next[from.stage].map((o, i) => ({ ...o, order: i }))
  }
  return next
}
