import { chapters } from '../src/data/chapters'
import { examModules } from '../src/data/caseEssayPoints'
import { generateQuestions } from '../src/data/quizGen'

const samples: [number, string, number][] = [
  [7, '7.1', 0],
  [12, '12.2', 1],
  [5, '5.3', 2],
  [2, '2.5', 1],
  [101, 'C1', 1],
  [102, 'E1', 2],
]

const L = ['A', 'B', 'C', 'D']
for (const [cid, sid, i] of samples) {
  const ch = chapters.find((c) => c.id === cid)
  const sec = ch?.sections.find((s) => s.id === sid)
  const text = sec ? sec.points[i] : examModules.find((m) => m.id === cid)!.sections.find((s) => s.id === sid)!.points[i]
  console.log(`\n==== ${cid}|${sid}|${i} ${text.slice(0, 50)}…`)
  for (const q of generateQuestions(cid, sid, i, text)) {
    if (q.kind === 'mcq') {
      console.log(`  [${q.kind}] ${q.mcq.q}`)
      q.mcq.options.forEach((o, oi) => console.log(`    ${L[oi]}. ${o.slice(0, 60)}${oi === q.mcq.answer ? '  ★答案' : ''}`))
    } else if (q.kind === 'member') {
      console.log(`  [${q.kind}] 不属于「${q.subject}」的是 → ${q.options.map((o, oi) => `${L[oi]}.${o}`).join(' ')} (答案${L[q.answer]})`)
    } else {
      console.log(`  [${q.kind}] 「${q.subject}」排序 (答案${L[q.answer]})`)
    }
  }
}
