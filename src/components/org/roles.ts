import { m } from '~/lib/paraglide/messages'

/** Rôles d'un membre dans une organisation (miroir client de `convex/lib/withOrg`). */
export type OrgRole = 'admin' | 'head_sell' | 'commercial' | 'sdr'

/** Ordre canonique d'affichage (du plus au moins privilégié). */
export const ROLE_ORDER: OrgRole[] = ['admin', 'head_sell', 'commercial', 'sdr']

/** Rôles « manager » : voient l'équipe et pointent les priorités. */
export function isManagerRole(role: OrgRole): boolean {
  return role === 'admin' || role === 'head_sell'
}

export const ROLE_META: Record<
  OrgRole,
  { label: () => string; desc: () => string; chip: string }
> = {
  admin: {
    label: m.role_admin,
    desc: m.role_admin_desc,
    chip: 'bg-accent-soft text-accent',
  },
  head_sell: {
    label: m.role_head_sell,
    desc: m.role_head_sell_desc,
    chip: 'bg-success-soft text-success',
  },
  commercial: {
    label: m.role_commercial,
    desc: m.role_commercial_desc,
    chip: 'bg-surface-2 text-fg-muted',
  },
  sdr: {
    label: m.role_sdr,
    desc: m.role_sdr_desc,
    chip: 'bg-surface-2 text-fg-subtle',
  },
}

export function roleLabel(role: OrgRole): string {
  return ROLE_META[role].label()
}
