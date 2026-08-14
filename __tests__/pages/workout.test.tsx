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
  isPreview: false,
  week: 2,
  cycle: 1,
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

const mockPreviewData: WorkoutData = {
  routine: 'A: Press',
  isPreview: true,
  week: 3,
  cycle: 1,
  groups: [
    {
      setType: 'warm-up',
      exercise: 'Overhead Press',
      displayName: 'Overhead Press',
      equipment: 'barbell',
      sets: [
        { rowIndex: -1, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
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

  it('shows Complete Workout button when not a preview', async () => {
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

  it('shows Start Workout button and hides Complete button in preview mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPreviewData,
    })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')

    expect(screen.getByRole('button', { name: /start workout/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete workout/i })).not.toBeInTheDocument()
  })

  it('calls POST and transitions to active mode when Start Workout is clicked', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPreviewData })
      .mockResolvedValueOnce({ ok: true, json: async () => mockWorkoutData })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')
    await user.click(screen.getByRole('button', { name: /start workout/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/workout/'),
      expect.objectContaining({ method: 'POST' })
    )

    // After POST, Complete button should appear and Start button should be gone
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /start workout/i })).not.toBeInTheDocument()
    })
  })

  it('displays week and cycle as subtitle', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockWorkoutData })
    render(<WorkoutPage />)
    await screen.findByText('A: Press')
    expect(screen.getByText('Week 2 · Cycle 1')).toBeInTheDocument()
  })

  it('does not render a deload modal', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockWorkoutData })
    render(<WorkoutPage />)
    await screen.findByText('A: Press')
    expect(screen.queryByText(/3 Weeks Complete/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Do Deload Week/i)).not.toBeInTheDocument()
  })
})
