import '@tanstack/react-table'

/**
 * Augmente `ColumnMeta` de TanStack Table avec des classes utilitaires de
 * cellule / en-tete partagees par toutes les listes Filon (responsive, aligne).
 */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    cellClassName?: string
    headerClassName?: string
  }
}
