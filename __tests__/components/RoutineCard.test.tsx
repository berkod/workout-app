import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoutineCard } from '@/components/RoutineCard'

describe('RoutineCard', () => {
  it('displays routine name and last completed date', () => {
    render(
      <RoutineCard name="Day 1 – Press" lastCompleted="2026-03-28" />
    )

    expect(screen.getByText('Day 1 – Press')).toBeInTheDocument()
    expect(screen.getByText('Last: 2026-03-28')).toBeInTheDocument()
  })

  it('displays "Never" when no last completed date', () => {
    render(<RoutineCard name="Day 3 – Bench" lastCompleted={null} />)

    expect(screen.getByText('Day 3 – Bench')).toBeInTheDocument()
    expect(screen.getByText('Last: Never')).toBeInTheDocument()
  })

  it('renders as a link to the workout page', () => {
    render(<RoutineCard name="Day 1 – Press" lastCompleted="2026-03-28" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/workout/Day%201%20%E2%80%93%20Press'
    )
  })
})
