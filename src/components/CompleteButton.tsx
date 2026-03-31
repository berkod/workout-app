'use client'

interface CompleteButtonProps {
  onComplete: () => void
  loading: boolean
}

export function CompleteButton({ onComplete, loading }: CompleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={loading}
      className="mt-6 w-full rounded-lg bg-fall-rust py-4 text-lg font-bold text-white shadow-md active:bg-fall-bark disabled:opacity-50"
    >
      {loading ? 'Saving...' : 'Complete Workout'}
    </button>
  )
}
