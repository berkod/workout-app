import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableField } from '@/components/EditableField'

describe('EditableField', () => {
  it('displays value as text by default', () => {
    render(<EditableField value="95" onSave={vi.fn()} />)

    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('switches to input on tap', async () => {
    const user = userEvent.setup()
    render(<EditableField value="95" onSave={vi.fn()} />)

    await user.click(screen.getByText('95'))

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('95')
  })

  it('calls onSave and returns to text on blur', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditableField value="95" onSave={onSave} />)

    await user.click(screen.getByText('95'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab() // blur

    expect(onSave).toHaveBeenCalledWith('100')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('does not call onSave if value unchanged', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditableField value="95" onSave={onSave} />)

    await user.click(screen.getByText('95'))
    await user.tab() // blur without changing

    expect(onSave).not.toHaveBeenCalled()
  })
})
