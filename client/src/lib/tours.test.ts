import { describe, it, expect } from 'vitest'
import type { TourLog } from '@utpost/shared'
import { elevationGain, formatKm } from './tours'

// Hjälpare: bara höjden spelar roll för testet, resten är ointressant men typen kräver det.
const log = (elevation_m: number | null, id = 0): TourLog => ({
  id,
  tour_id: 1,
  recorded_at: '2026-09-01T08:00:00.000Z',
  lat: 67.9,
  lon: 18.5,
  elevation_m,
  heart_rate: null,
  note: null,
})

describe('elevationGain', () => {
  it('summerar bara stigningar, inte nedförsbackar', () => {
    expect(elevationGain([log(100), log(150), log(120), log(180)])).toBe(110)
  })

  it('ger 0 för en tur utan mätpunkter', () => {
    expect(elevationGain([])).toBe(0)
  })

  // Regressionstest – skuld ur docs/debt.md: en mätpunkt utan höjd räknades som havsnivå,
  // så nästa punkt gav en påhittad stigning (150 i stället för 50).
  it('hoppar över mätpunkter utan höjd i stället för att räkna dem som noll', () => {
    expect(elevationGain([log(100), log(null), log(150)])).toBe(50)
  })
})

describe('formatKm', () => {
  it('avrundar meter till en decimal med komma', () => {
    expect(formatKm(12345)).toBe('12,3 km')
  })
})
