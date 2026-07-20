import { auditWordPack } from '../src/words/audit'
import { builtinPacks } from '../src/words/packs'

let issueCount = 0
const ids = new Set<string>()
const combinations = new Set<string>()

function fail(message: string): void {
  issueCount += 1
  console.error(`  ${message}`)
}

for (const pack of builtinPacks) {
  const issues = auditWordPack(pack)
  issueCount += issues.length
  console.log(`${pack.name}: ${pack.pairs.length} pairs, ${issues.length} audit issues`)

  if (pack.pairs.length !== 250) {
    fail(`expected exactly 250 pairs, found ${pack.pairs.length}`)
  }

  for (const issue of issues) {
    console.log(
      `  #${issue.pairIndex + 1} ${issue.a} / ${issue.b}: ${issue.rule} (${issue.term})`,
    )
  }

  for (const pair of pack.pairs) {
    if (ids.has(pair.id)) fail(`duplicate pair id: ${pair.id}`)
    ids.add(pair.id)

    const combination = [pair.a.trim().toLowerCase(), pair.b.trim().toLowerCase()]
      .sort()
      .join('||')
    if (combinations.has(combination)) {
      fail(`duplicate pair: ${pair.a} / ${pair.b}`)
    }
    combinations.add(combination)
  }
}

if (issueCount > 0) {
  console.error(`Pack audit failed with ${issueCount} issue${issueCount === 1 ? '' : 's'}.`)
  process.exitCode = 1
}
