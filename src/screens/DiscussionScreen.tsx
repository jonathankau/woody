import type { GameState } from '../engine'

/** Discussion prompt before the vote. */
export function DiscussionScreen({
  state,
  onVote,
}: {
  state: GameState
  onVote: () => void
}): React.JSX.Element {
  return (
    <section className="screen discussion">
      <h2 className="screen-title">Discuss</h2>
      <div className="card discussion-card">
        <p>
          Round {state.round}. Talk it out — who sounded a little too vague, a
          little too specific, or a little too quiet? Compare notes, then take it
          to a vote.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onVote}
        data-testid="discussion-vote"
      >
        Go to vote
      </button>
    </section>
  )
}
