import Link from 'next/link'

interface RoutineCardProps {
  name: string
  lastCompleted: string | null
}

export function RoutineCard({ name, lastCompleted }: RoutineCardProps) {
  return (
    <Link
      href={`/workout/${encodeURIComponent(name)}`}
      className="block rounded-lg border border-fall-wheat bg-white p-4 shadow-sm active:bg-fall-wheat"
    >
      <h2 className="text-lg font-semibold text-fall-rust">{name}</h2>
      <p className="mt-1 text-sm text-fall-bark-light">
        Last: {lastCompleted ?? 'Never'}
      </p>
    </Link>
  )
}
