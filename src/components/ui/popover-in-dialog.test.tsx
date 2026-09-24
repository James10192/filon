import { afterEach, describe, expect, it } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

/**
 * Régression d'août 2026 : la Dialog et les menus (Popover, Select) chargeaient
 * deux copies différentes des couches Radix `react-dismissable-layer` et
 * `react-focus-scope`. Chaque copie tient son propre registre : la Dialog modale
 * bloquait les clics de la page et reprenait le focus sans savoir qu'un menu
 * s'ouvrait au-dessus. En prod : impossible de taper dans la recherche d'un
 * combobox (« Créer « … » ») ni d'utiliser un menu dans un formulaire modal.
 */
function OpportunityLikeForm() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Nouvelle opportunité</DialogTitle>
        <DialogDescription>Entreprise et étape de l’opportunité.</DialogDescription>
        <Popover>
          <PopoverTrigger>Choisir une entreprise</PopoverTrigger>
          <PopoverContent data-testid="combobox-layer">
            <input placeholder="Rechercher ou créer…" />
          </PopoverContent>
        </Popover>
        <Select>
          <SelectTrigger aria-label="Étape">
            <SelectValue placeholder="Étape" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Prospect</SelectItem>
            <SelectItem value="won">Gagnée</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  )
}

function openCompanyCombobox() {
  render(<OpportunityLikeForm />)
  fireEvent.click(screen.getByText('Choisir une entreprise'))
}

afterEach(cleanup)

describe('Menus ouverts dans une Dialog modale', () => {
  it('le combobox reste cliquable alors que la Dialog bloque le reste de la page', () => {
    openCompanyCombobox()

    expect(document.body.style.pointerEvents).toBe('none')
    expect(screen.getByTestId('combobox-layer').style.pointerEvents).toBe('auto')
  })

  it('le champ de recherche du combobox garde le focus pour permettre la saisie', () => {
    openCompanyCombobox()
    const search = screen.getByPlaceholderText('Rechercher ou créer…')

    act(() => search.focus())

    expect(document.activeElement).toBe(search)
  })

  it('un Select ouvert au clavier garde le focus sur ses options', async () => {
    render(<OpportunityLikeForm />)

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Étape' }), {
      key: 'Enter',
    })

    // Radix place le focus une fois le menu positionné (calcul asynchrone).
    await waitFor(() =>
      expect(screen.getByRole('listbox').contains(document.activeElement)).toBe(true),
    )
  })
})
