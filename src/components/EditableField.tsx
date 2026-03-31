'use client'

import { useState, useRef, useEffect } from 'react'

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => void
}

export function EditableField({ value, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleBlur() {
    setEditing(false)
    if (localValue !== value) {
      onSave(localValue)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        role="textbox"
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-16 rounded border border-fall-copper bg-white px-2 py-1 text-center text-sm"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded px-2 py-1 text-sm text-fall-copper underline decoration-dotted"
    >
      {localValue}
    </button>
  )
}
