/**
 * Small inline SVG diagrams for How to Play. Decorative shapes are
 * `aria-hidden`; each figure carries a meaningful `<title>` for screen readers.
 */

export function RoleOverviewDiagram(): React.JSX.Element {
  return (
    <svg
      className="howto-diagram"
      viewBox="0 0 220 90"
      role="img"
      aria-labelledby="diagram-roles-title"
    >
      <title id="diagram-roles-title">
        Two cards share a word, one has a different word, one is blank.
      </title>
      <g aria-hidden="true">
        <g>
          <rect x="6" y="20" width="44" height="56" rx="8" className="diagram-card" />
          <text x="28" y="52" className="diagram-word">Tea</text>
        </g>
        <g>
          <rect x="58" y="20" width="44" height="56" rx="8" className="diagram-card" />
          <text x="80" y="52" className="diagram-word">Tea</text>
        </g>
        <g>
          <rect
            x="110"
            y="20"
            width="44"
            height="56"
            rx="8"
            className="diagram-card diagram-card-alt"
          />
          <text x="132" y="52" className="diagram-word">Coffee</text>
        </g>
        <g>
          <rect
            x="162"
            y="20"
            width="44"
            height="56"
            rx="8"
            className="diagram-card diagram-card-blank"
          />
          <text x="184" y="52" className="diagram-word">?</text>
        </g>
      </g>
    </svg>
  )
}

export function HandoffDiagram(): React.JSX.Element {
  const steps = ['Pass', 'Peek', 'Hide', 'Pass']
  return (
    <svg
      className="howto-diagram"
      viewBox="0 0 220 60"
      role="img"
      aria-labelledby="diagram-handoff-title"
    >
      <title id="diagram-handoff-title">
        The phone flows: pass, peek, hide, then pass again.
      </title>
      <g aria-hidden="true">
        {steps.map((label, i) => {
          const x = 8 + i * 54
          return (
            <g key={i}>
              <rect x={x} y="16" width="40" height="28" rx="8" className="diagram-node" />
              <text x={x + 20} y="34" className="diagram-node-label">
                {label}
              </text>
              {i < steps.length - 1 && (
                <text x={x + 47} y="34" className="diagram-arrow">
                  ›
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export function RoundLoopDiagram(): React.JSX.Element {
  const steps = ['Clue', 'Discuss', 'Vote', 'Eliminate']
  return (
    <svg
      className="howto-diagram"
      viewBox="0 0 220 70"
      role="img"
      aria-labelledby="diagram-loop-title"
    >
      <title id="diagram-loop-title">
        Each round loops: clue, discuss, vote, eliminate, repeat.
      </title>
      <g aria-hidden="true">
        {steps.map((label, i) => {
          const x = 4 + i * 54
          return (
            <g key={i}>
              <rect x={x} y="14" width="46" height="30" rx="8" className="diagram-node" />
              <text x={x + 23} y="33" className="diagram-node-label">
                {label}
              </text>
              {i < steps.length - 1 && (
                <text x={x + 50} y="33" className="diagram-arrow">
                  ›
                </text>
              )}
            </g>
          )
        })}
        <text x="110" y="62" className="diagram-loop-label">
          ↺ repeat each round
        </text>
      </g>
    </svg>
  )
}
