/**
 * Reusable "How to Play" trigger + sheet. Renders a button that opens the
 * HowToPlay bottom sheet for the given rules.
 */

import { useState } from 'react'
import type { RuleSet } from '../engine'
import { HowToPlay } from './HowToPlay'

export function HowToPlayButton({
  rules,
  className = 'btn btn-ghost',
  label = 'How to Play',
}: {
  rules: RuleSet
  className?: string
  label?: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        data-testid="howto-open"
      >
        {label}
      </button>
      {open && <HowToPlay rules={rules} onClose={() => setOpen(false)} />}
    </>
  )
}
