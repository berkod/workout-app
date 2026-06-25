import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import Home from '@/app/page'

describe('Home page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders routine cards after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'A: Press', lastCompleted: '2026-03-28' },
        { name: 'B: RDL', lastCompleted: null },
      ],
    })

    render(<Home />)

    // Wait for data to load
    expect(await screen.findByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('B: RDL')).toBeInTheDocument()
    expect(screen.getByText('Last: 2026-03-28')).toBeInTheDocument()
    expect(screen.getByText('Last: Never')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves

    render(<Home />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
