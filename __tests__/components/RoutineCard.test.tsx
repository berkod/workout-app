import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoutineCard } from '@/components/RoutineCard'

describe('RoutineCard', () => {
  it('displays routine name and last completed date', () => {
    render(
      <RoutineCard name="A: Press" lastCompleted="2026-03-28" />
    )

    expect(screen.getByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('Last: 2026-03-28')).toBeInTheDocument()
  })

  it('displays "Never" when no last completed date', () => {
    render(<RoutineCard name="C: Bench" lastCompleted={null} />)

    expect(screen.getByText('C: Bench')).toBeInTheDocument()
    expect(screen.getByText('Last: Never')).toBeInTheDocument()
  })

  it('renders as a link to the workout page', () => {
    render(<RoutineCard name="A: Press" lastCompleted="2026-03-28" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/workout/Day%201%20%E2%80%93%20Press'
    )
  })
})
