import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { render, screen } from '@testing-library/vue'
import { useQuery } from '@urql/vue'
import HomeView from './HomeView.vue'

// Samma princip som GuidesView.test.ts: vi mockar gränsen mot nätverket, inte fetch.
// Sedan M5 är gränsen useQuery från urql – den får svara med färdiga refs.
vi.mock('@urql/vue', () => ({ useQuery: vi.fn() }))
const mockedUseQuery = vi.mocked(useQuery)

const svar = (data: unknown, error?: Error) =>
  ({ data: ref(data), fetching: ref(false), error: ref(error) }) as ReturnType<typeof useQuery>

const renderView = () =>
  render(HomeView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('HomeView', () => {
  it('visar startsidan från ett enda GraphQL-anrop', async () => {
    mockedUseQuery.mockReturnValue(
      svar({
        guides: [
          {
            slug: 'kebnekaise',
            title: 'Kebnekaise',
            region: 'Lappland',
            difficulty: 'svår',
            lengthKm: 18,
          },
        ],
        popularGuides: [{ slug: 'kebnekaise', title: 'Kebnekaise', region: 'Lappland' }],
        regions: ['Lappland', 'Småland'],
        tours: [{ id: '7', title: 'Kvällstur', distanceM: 8400 }],
      }),
    )
    renderView()

    expect(await screen.findByText('1 guider i 2 landskap.')).toBeInTheDocument()
    expect(screen.getByText('Kvällstur')).toBeInTheDocument()
    expect(screen.getByText('8.4 km')).toBeInTheDocument()
    expect(mockedUseQuery).toHaveBeenCalledTimes(1)
  })

  it('visar felet när GraphQL svarar med errors', async () => {
    mockedUseQuery.mockReturnValue(
      svar(undefined, new Error('[GraphQL] Cannot query field "titel" on type "Guide".')),
    )
    renderView()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot query field')
  })
})
