import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutSection } from '@/components/WorkoutSection'
import type { SetGroup } from '@/lib/types'

const group: SetGroup = {
  setType: 'warm-up',
  exercise: 'Overhead Press',
  sets: [
    { rowIndex: 2, date: '', routine: 'Day 1', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
    { rowIndex: 3, date: '', routine: 'Day 1', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '65', actualReps: '' },
  ],
}

describe('WorkoutSection', () => {
  it('displays set type and exercise in header', () => {
    render(
      <WorkoutSection group={group} isOpen={false} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getByText('warm-up')).toBeInTheDocument()
    expect(screen.getByText('Overhead Press')).toBeInTheDocument()
  })

  it('shows sets when open', () => {
    render(
      <WorkoutSection group={group} isOpen={true} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getAllByText('Overhead Press')).toHaveLength(3) // header + 2 rows
  })

  it('hides sets when collapsed', () => {
    render(
      <WorkoutSection group={group} isOpen={false} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    // Header still visible
    expect(screen.getByText('warm-up')).toBeInTheDocument()
    // Only the header exercise text, not the rows
    expect(screen.getAllByText('Overhead Press')).toHaveLength(1)
  })

  it('calls onToggle when header is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <WorkoutSection group={group} isOpen={true} onToggle={onToggle} onUpdate={vi.fn()} />
    )

    await user.click(screen.getByText('warm-up'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('shows completion count', () => {
    const partialGroup: SetGroup = {
      ...group,
      sets: [
        { ...group.sets[0], actualReps: '5' },
        { ...group.sets[1], actualReps: '' },
      ],
    }
    render(
      <WorkoutSection group={partialGroup} isOpen={true} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getByText('1/2')).toBeInTheDocument()
  })
})
