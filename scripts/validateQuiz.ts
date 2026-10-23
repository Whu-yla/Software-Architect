// 全量校验：每个知识点 3-5 题，选项唯一、答案有效、无“水题”
import { chapters } from '../src/data/chapters'
import { examModules } from '../src/data/caseEssayPoints'
import { generateQuestions } from '../src/data/quizGen'

let bad = 0
let total = 0
let counts: Record<number, number> = {}

function check(chapterId: number, sectionId: string, idx: number, text: string) {
  total++
  const qs = generateQuestions(chapterId, sectionId, idx, text)
  counts[qs.length] = (counts[qs.length] ?? 0) + 1
  const id = `${chapterId}|${sectionId}|${idx}`
  if (qs.length < 3 || qs.length > 5) {
    bad++
    console.log(`[数量异常 ${qs.length}] ${id} ${text.slice(0, 40)}`)
  }
  const ids = new Set<string>()
  for (const q of qs) {
    if (ids.has(q.id)) console.log(`[重复题ID] ${id} ${q.id}`)
    ids.add(q.id)
    if (q.kind === 'mcq') {
      const m = q.mcq
      const uniq = new Set(m.options)
      if (m.options.length !== 4 || uniq.size !== 4) {
        bad++
        console.log(`[选项异常] ${id} ${m.q} opts=${uniq.size}`)
      }
      if (m.answer < 0 || m.answer > 3) {
        bad++
        console.log(`[答案越界] ${id} ${m.q}`)
      }
      // 只对生成的辨析题校验原文一致性（题库真题 chapter 非空，跳过）
      if (m.chapter === '' && m.q.includes('错误的是') && m.options[m.answer] === text) {
        bad++
        console.log(`[找错题答案竟是原文] ${id}`)
      }
      if (m.chapter === '' && m.q.includes('正确的是') && m.options[m.answer] !== text) {
        bad++
        console.log(`[找对题答案非原文] ${id}`)
      }
      // 找错题：其余三项必须是原文级真实表述（这里校验不含本知识点原文）
      if (m.chapter === '' && m.q.includes('错误的是') && m.options.filter((o) => o === text).length > 0) {
        bad++
        console.log(`[找错题混入原文] ${id}`)
      }
    }
    if (q.kind === 'member' && q.answer < 0) console.log(`[归属题答案越界] ${id}`)
    if (q.kind === 'order' && q.answer < 0) console.log(`[排序题答案越界] ${id}`)
  }
}

for (const c of chapters) {
  for (const s of c.sections) s.points.forEach((p, i) => check(c.id, s.id, i, p))
}
for (const m of examModules) {
  for (const s of m.sections) s.points.forEach((p, i) => check(m.id, s.id, i, p))
}

console.log(`\n共校验 ${total} 个知识点，题量分布:`, counts)
console.log(bad === 0 ? '✅ 全部通过' : `❌ ${bad} 处问题`)
