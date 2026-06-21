import { Building2, User, Mail, MapPin } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Badge } from '~/components/ui/badge'
import { List } from './primitives'

/**
 * Widgets « carnet » : résultats de recherche d'entreprise (secteur + lieu) et
 * de contact (rôle + e-mail cliquable). Rendent `find_company` et `find_contact`.
 */

export type CompanyItem = {
  id: string
  name: string
  sector: string | null
  location?: string | null
}

export type ContactItem = {
  id: string
  name: string
  role: string | null
  email?: string | null
}

export function FindCompany({ items }: { items: CompanyItem[] }) {
  return (
    <List
      items={items}
      icon={Building2}
      count={(n) =>
        n > 1
          ? m.app_tool_companies_plural({ n })
          : m.app_tool_companies_singular({ n })
      }
      empty={m.app_tool_no_companies()}
      row={(c) => (
        <>
          <Building2 className="size-4 shrink-0 text-fg-subtle" />
          <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
          {c.sector && (
            <Badge variant="outline" className="shrink-0">
              {c.sector}
            </Badge>
          )}
          {c.location && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-muted">
              <MapPin className="size-3" />
              {c.location}
            </span>
          )}
        </>
      )}
    />
  )
}

export function FindContact({ items }: { items: ContactItem[] }) {
  return (
    <List
      items={items}
      icon={User}
      count={(n) =>
        n > 1
          ? m.app_tool_contacts_plural({ n })
          : m.app_tool_contacts_singular({ n })
      }
      empty={m.app_tool_no_contacts()}
      row={(c) => (
        <>
          <User className="size-4 shrink-0 text-fg-subtle" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm text-fg">{c.name}</span>
            {c.role && (
              <span className="block truncate text-xs text-fg-muted">{c.role}</span>
            )}
          </div>
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <Mail className="size-3" />
              <span className="hidden sm:inline">{c.email}</span>
            </a>
          )}
        </>
      )}
    />
  )
}
