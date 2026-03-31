import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompleteButton } from '@/components/CompleteButton'

describe('CompleteButton', () => {
  it('displays "Complete Workout" text', () => {
    render(<CompleteButton onComplete={vi.fn()} loading={false} />)

    expect(
      screen.getByRole('button', { name: /complete workout/i })
    ).toBeInTheDocument()
  })

  it('calls onComplete when clicked', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<CompleteButton onComplete={onComplete} loading={false} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  it('shows loading state and disables button', () => {
    render(<CompleteButton onComplete={vi.fn()} loading={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })
})
