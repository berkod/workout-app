import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkoutData } from '@/lib/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ routine: 'Day%201%20%E2%80%93%20Press' }),
  useRouter: () => ({ push: vi.fn() }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import WorkoutPage from '@/app/workout/[routine]/page'

const mockWorkoutData: WorkoutData = {
  routine: 'A: Press',
  groups: [
    {
      setType: 'warm-up',
      exercise: 'Overhead Press',
      displayName: 'Overhead Press',
      equipment: 'barbell',
      sets: [
        { rowIndex: 2, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
      ],
    },
    {
      setType: 'main',
      exercise: 'Overhead Press',
      displayName: 'Overhead Press',
      equipment: 'barbell',
      sets: [
        { rowIndex: 4, date: '', routine: 'A: Press', setType: 'main', exercise: 'Overhead Press', targetReps: '5', targetWeight: '95', actualReps: '' },
      ],
    },
  ],
}

describe('Workout page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('loads and displays workout sections', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    expect(await screen.findByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('warm-up')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('opens warm-up section by default and collapses others', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    // Wait for load
    await screen.findByText('A: Press')

    // warm-up section should show its set rows (target weight 45 visible)
    expect(screen.getByText('45')).toBeInTheDocument()

    // main section should be collapsed (target weight 95 NOT visible as an editable field in a row)
    // The "main" header text is visible, but the set row content (95) should not be
    const allText = screen.queryAllByText('95')
    expect(allText).toHaveLength(0)
  })

  it('sends PATCH request when actual reps saved', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkoutData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')

    // Input initializes to targetReps ('5'); click Save directly
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: 2, column: 'actualReps', value: '5' }),
      })
    })
  })

  it('shows Complete Workout button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')

    expect(
      screen.getByRole('button', { name: /complete workout/i })
    ).toBeInTheDocument()
  })
})
