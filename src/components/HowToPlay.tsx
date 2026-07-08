/**
 * How to Play — a bottom-sheet modal explaining the game in seven short
 * sections, plus inline diagrams and a win chart generated from the active
 * rules. Accessible: role="dialog", aria-modal, labelled title, Escape and
 * backdrop close, focus moved into the sheet on open.
 */

import { useEffect, useRef } from 'react'
import type { RuleSet } from '../engine'
import { winChart } from '../engine'
import { RoleOverviewDiagram, HandoffDiagram, RoundLoopDiagram } from './diagrams'

const TITLE_ID = 'howto-title'

export function HowToPlay({
  rules,
  onClose,
}: {
  rules: RuleSet
  onClose: () => void
}): React.JSX.Element {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const chart = winChart(rules)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet howto-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        ref={sheetRef}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="howto-header">
          <h2 className="howto-title" id={TITLE_ID}>
            How to Play
          </h2>
          <button
            type="button"
            className="btn btn-ghost howto-close"
            onClick={onClose}
            data-testid="howto-close"
          >
            Close
          </button>
        </header>

        <div className="howto-body" tabIndex={0}>
          <section className="howto-section">
            <h3 className="howto-section-title">Goal</h3>
            <p>
              Figure out who is on your team without knowing your role. Most
              players share one secret word; a few sneaky infiltrators have a
              different word (or none at all). Blend in, sniff out the odd ones,
              and vote them out before they take over.
            </p>
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Roles</h3>
            <p>
              Civilians all share the same word. Undercovers share a related but
              different word. The Baiban (blank / Mr. White) gets no word at all.
              You only ever see your word, never your role, so read the room.
            </p>
            <RoleOverviewDiagram />
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Reveal</h3>
            <p>
              The phone goes around the circle. Each person taps to peek at their
              word in private, then hides it and passes on. Keep the screen to
              yourself. No peeking at a friend&apos;s reveal.
            </p>
            <HandoffDiagram />
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Round Loop</h3>
            <p>
              Each round: give one clue about your word (never say the word
              itself), discuss who feels off, then take a public vote. The clue
              order is random once per game and stays the same as players leave;
              Baiban never starts the clues.
            </p>
            <RoundLoopDiagram />
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Voting</h3>
            <p>
              Vote out loud, together. No secret ballots and no voting for
              yourself. Once the group has a result, the host taps who was voted
              off, or taps no elimination if the vote tied. No elimination means
              another clue round, then another vote.
            </p>
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Baiban</h3>
            <p>
              The Baiban has no word and has to bluff purely on vibes. Depending
              on the rules, a voted-out Baiban gets one shot to guess the
              civilians&apos; word out loud, or wins by simply outlasting every
              undercover.
            </p>
          </section>

          <section className="howto-section">
            <h3 className="howto-section-title">Winning</h3>
            <p>Here is how each team wins with your current rules:</p>
            <table className="howto-winchart">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">How they win</th>
                </tr>
              </thead>
              <tbody>
                {chart.map((row) => (
                  <tr key={row.team}>
                    <th scope="row">{row.team}</th>
                    <td>{row.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
