import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetRow } from '@/components/SetRow'
import type { SheetRow } from '@/lib/types'

const baseSet: SheetRow = {
  rowIndex: 5,
  date: '',
  routine: 'Day 1 – Press',
  setType: 'main',
  exercise: 'Overhead Press',
  targetReps: '5',
  targetWeight: '95',
  actualReps: '',
}

describe('SetRow', () => {
  it('displays exercise, target weight, and target reps', () => {
    render(<SetRow set={baseSet} onUpdate={vi.fn()} />)

    expect(screen.getByText('Overhead Press')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows input field for actual reps', () => {
    render(<SetRow set={baseSet} onUpdate={vi.fn()} />)

    const input = screen.getByPlaceholderText('Reps')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('shows save button and calls onUpdate when clicked', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<SetRow set={baseSet} onUpdate={onUpdate} />)

    const input = screen.getByPlaceholderText('Reps')
    await user.type(input, '5')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    expect(onUpdate).toHaveBeenCalledWith(5, 'actualReps', '5')
  })

  it('displays existing actual reps value', () => {
    const set = { ...baseSet, actualReps: '8' }
    render(<SetRow set={set} onUpdate={vi.fn()} />)

    const input = screen.getByPlaceholderText('Reps')
    expect(input).toHaveValue('8')
  })

  it('calls onUpdate when editable target weight is saved', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<SetRow set={baseSet} onUpdate={onUpdate} />)

    // Click on target weight to edit
    await user.click(screen.getByText('95'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab()

    expect(onUpdate).toHaveBeenCalledWith(5, 'targetWeight', '100')
  })
})
