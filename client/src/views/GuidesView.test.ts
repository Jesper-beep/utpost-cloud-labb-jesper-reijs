import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import type { Guide } from '@utpost/shared'
import GuidesView from './GuidesView.vue'
import { get } from '../api'

// Komponenten pratar med API:et genom vår egen modul – den mockar vi. Inte fetch, inte nätverket.
vi.mock('../api', () => ({ get: vi.fn() }))
const mockedGet = vi.mocked(get)

const guide = (overrides: Partial<Guide>): Guide => ({
  id: 1,
  slug: 'kebnekaise',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'svår',
  length_km: 18,
  body_html: '<p>Sveriges tak</p>',
  hero_image: null,
  published: true,
  author_id: 1,
  updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
})

// RouterLink finns inte utan en router – en stub som renderar en vanlig länk räcker.
const renderView = () =>
  render(GuidesView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('GuidesView', () => {
  beforeEach(() => {
    mockedGet.mockResolvedValue([
      guide({ id: 1, slug: 'kebnekaise', title: 'Kebnekaise', region: 'Lappland' }),
      guide({ id: 2, slug: 'sodra-myrleden', title: 'Södra Myrleden', region: 'Småland' }),
    ])
  })

  it('visar guiderna från API:et', async () => {
    renderView()
    expect(await screen.findByText('Kebnekaise')).toBeInTheDocument()
    expect(screen.getByText('Södra Myrleden')).toBeInTheDocument()
    expect(screen.getByText('2 av 2')).toBeInTheDocument()
  })

  it('filtrerar på landskap när användaren söker', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Kebnekaise')

    await user.type(screen.getByLabelText('Sök'), 'små')

    expect(screen.getByText('Södra Myrleden')).toBeInTheDocument()
    expect(screen.queryByText('Kebnekaise')).not.toBeInTheDocument()
    expect(screen.getByText('1 av 2')).toBeInTheDocument()
  })

  it('säger till när inget matchar', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Kebnekaise')

    await user.type(screen.getByLabelText('Sök'), 'xyz')

    expect(screen.getByText('Inga guider matchar sökningen.')).toBeInTheDocument()
  })

  it('visar ett fel när API:et inte svarar', async () => {
    mockedGet.mockRejectedValueOnce(new Error('API svarade 500'))
    renderView()
    expect(await screen.findByRole('alert')).toHaveTextContent('API svarade 500')
  })
})
