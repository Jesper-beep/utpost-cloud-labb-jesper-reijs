import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { render, screen } from '@testing-library/vue'
import { useQuery } from '@urql/vue'
import ToursView from './ToursView.vue'

vi.mock('@urql/vue', () => ({ useQuery: vi.fn() }))
const mockedUseQuery = vi.mocked(useQuery)

const svar = (data: unknown, error?: Error) =>
  ({ data: ref(data), fetching: ref(false), error: ref(error) }) as ReturnType<typeof useQuery>

const renderView = () =>
  render(ToursView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('ToursView', () => {
  it('visar turerna med vem som gick och vilken guide', async () => {
    mockedUseQuery.mockReturnValue(
      svar({
        tours: [
          {
            id: '1',
            title: 'Morgontur',
            distanceM: 12345,
            user: { displayName: 'Sara Ek' },
            guide: { title: 'Kebnekaise' },
            photos: [{ id: '1' }, { id: '2' }],
          },
          {
            id: '2',
            title: 'Kvällstur',
            distanceM: 8400,
            user: { displayName: 'Erik Lind' },
            guide: null,
            photos: [],
          },
        ],
      }),
    )
    renderView()

    expect(await screen.findByText('Morgontur')).toBeInTheDocument()
    expect(screen.getByText('Sara Ek')).toBeInTheDocument()
    expect(screen.getByText('Kebnekaise')).toBeInTheDocument()
    expect(screen.getByText('12,3 km')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument() // turen utan guide
  })

  it('visar ett fel när API:et inte svarar', async () => {
    mockedUseQuery.mockReturnValue(svar(undefined, new Error('[Network] Failed to fetch')))
    renderView()

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
