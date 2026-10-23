// 知识点题目生成器 v2 —— 真题风格
// 每个知识点生成 3-5 道四选一单选题：
//   1. 概念辨析（"正确的是"/"错误的是"，干扰项=经过科学篡改的错误表述 或 同节真实表述）
//   2. 归属判断（"不属于…的是"，干扰项来自其他分类）
//   3. 排序题（有序枚举）
//   4. 内容匹配的历年真题风格选择题
// 所有正确答案均直接取自知识点原文，错误选项通过"张冠李戴/数字篡改/方向反转/枚举替换"
// 等可证明为错的篡改方式生成，杜绝瞎出题。

import { chapters } from './chapters'
import { examModules } from './caseEssayPoints'
import { mcqs, type MCQ } from './exam'

// ================= 基础工具 =================

function hashStr(k: string) {
  let h = 7
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0
  return Math.abs(h) + 1
}

// 确定性洗牌（同一知识点每次题目、选项顺序一致）
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

// ================= 枚举/序列抽取 =================

export interface ListInfo {
  subject: string // 列表主题，如 "内聚程度"
  items: string[]
  ordered: boolean // 是否有序（排序题）
  direction: string // "由低到高" 等
}

function cleanItem(s: string): string {
  return s
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/^(?:和|及|与|以及|描述|包括|包含|分为|由|是)/, '')
    .replace(/等$/, '')
    .replace(/[，,。；;：:\s]/g, '')
    .trim()
}

function validItem(s: string): boolean {
  if (!s || s.length > 10) return false
  if (/^(?:即|如|典型|例如|例如)/.test(s)) return false
  return true
}

function cleanSubject(s: string): string {
  let t = s.replace(/[。；;，,]/g, ' ').trim()
  t = t.split(/\s+/).pop() ?? t
  t = t.replace(/^(?:分为|划分为|包括|包含|有|主要有|包括有|是|为|即|由)/, '').replace(/(?:分为|包括)$/, '').trim()
  if (t.length > 14) t = t.slice(-14)
  return t
}

export function extractLists(text: string): ListInfo[] {
  const out: ListInfo[] = []
  const clauses = text.split(/[。；;]/).map((c) => c.trim()).filter(Boolean)
  for (const clause of clauses) {
    const rawArrow = clause.split('→')
    if (rawArrow.length >= 4) {
      let head = rawArrow[0]
      const ci = head.search(/[：:]/)
      const subj = ci >= 0 ? cleanSubject(head.slice(0, ci)) : ''
      if (ci >= 0) head = head.slice(ci + 1)
      const arrowParts = [head, ...rawArrow.slice(1)].map((s) => cleanItem(s)).filter(validItem)
      if (arrowParts.length >= 4) {
        const dir = /由低到高|从低到高/.test(clause)
          ? '由低到高'
          : /由高到低|从高到低/.test(clause)
            ? '由高到低'
            : /递增/.test(clause)
              ? '由低到高'
              : /递减/.test(clause)
                ? '由高到低'
                : '正确'
        out.push({ subject: subj || '下列各项', items: arrowParts, ordered: true, direction: dir })
        continue
      }
    }
    const colon = clause.search(/[：:]/)
    if (colon > 0) {
      const after = clause.slice(colon + 1)
      const rawItems = after.split(/、|，以及|，及|，和|,/).map((s) => cleanItem(s)).filter(validItem)
      if (rawItems.length >= 3) {
        const subjRaw = clause.slice(0, colon)
        const dir = /由低到高|从低到高/.test(subjRaw)
          ? '由低到高'
          : /由高到低|从高到低/.test(subjRaw)
            ? '由高到低'
            : /递增/.test(subjRaw)
              ? '由低到高'
              : /递减/.test(subjRaw)
                ? '由高到低'
                : ''
        out.push({ subject: cleanSubject(subjRaw) || '下列分类', items: rawItems, ordered: !!dir, direction: dir })
      }
    }
    const paren = clause.match(/（([^（）]*、[^（）]*)）/)
    if (paren) {
      const items = paren[1].split('、').map((s) => cleanItem(s)).filter(validItem)
      if (items.length >= 3) {
        const before = clause.slice(0, paren.index)
        out.push({ subject: cleanSubject(before) || '下列各项', items, ordered: false, direction: '' })
      }
    }
  }
  return out
}

// ================= 章节上下文（同节兄弟知识点 = 干扰项素材） =================

interface Ctx {
  sectionTitle: string
  points: string[] // 同节全部知识点
}

const ctxCache = new Map<string, Ctx>()

function sectionCtx(chapterId: number, sectionId: string): Ctx {
  const ck = `${chapterId}|${sectionId}`
  if (!ctxCache.has(ck)) {
    const ch = chapters.find((c) => c.id === chapterId)
    const sec = ch?.sections.find((s) => s.id === sectionId)
    if (sec) {
      ctxCache.set(ck, { sectionTitle: sec.title, points: sec.points })
    } else {
      const mod = examModules.find((m) => m.id === chapterId)
      const msec = mod?.sections.find((s) => s.id === sectionId)
      ctxCache.set(ck, {
        sectionTitle: msec?.title ?? '',
        points: msec?.points ?? [],
      })
    }
  }
  return ctxCache.get(ck)!
}

// 同章（或同模块）所有知识点，用于全局干扰项
function chapterPoints(chapterId: number): string[] {
  const ch = chapters.find((c) => c.id === chapterId)
  if (ch) return ch.sections.flatMap((s) => s.points)
  const mod = examModules.find((m) => m.id === chapterId)
  return mod ? mod.sections.flatMap((s) => s.points) : []
}

// 知识点主题词："主题：内容" 取主题，否则取小节名
function pointSubject(text: string, fallback: string): string {
  const m = text.match(/^([^：:，。；]{2,15})：/)
  if (m) return m[1]
  return fallback || '该知识点'
}

// ================= 篡改器：把真表述改成"可证明为错"的表述 =================

// 安全反义词对：替换后语义必反
const ANTONYM_PAIRS: [string, string][] = [
  ['由低到高', '由高到低'],
  ['从高到低', '从低到高'],
  ['高内聚低耦合', '低内聚高耦合'],
  ['松耦合', '紧耦合'],
  ['同步', '异步'],
  ['提高', '降低'],
  ['提升', '降低'],
  ['增大', '减小'],
  ['增强', '减弱'],
  ['加快', '减慢'],
  ['上升', '下降'],
  ['最长', '最短'],
  ['最长路径', '最短路径'],
  ['可串行化', '不可串行化'],
  ['易扩展', '难以扩展'],
  ['易维护', '难以维护'],
  ['支持并行', '只能串行'],
  ['无状态', '有状态'],
  ['先更库再删缓存', '先删缓存再更库'],
  ['串行', '并行'],
]

// 篡改一段文本，返回错误版本；无法安全篡改时返回 null
function corruptText(text: string, seed: number, swapSubjects: string[]): string | null {
  const strategies: (() => string | null)[] = [
    // 1. 张冠李戴：主题词替换为别的主题（定义与主题不匹配，必错）
    () => {
      const m = text.match(/^([^：:，。；]{2,15})(：)/)
      if (!m) return null
      const self = m[1]
      const others = swapSubjects.filter((s) => s && s !== self && !text.includes(s))
      if (!others.length) return null
      return text.replace(m[0], pick(others, seed) + '：')
    },
    // 2. 反义词/方向反转
    () => {
      const pairs = ANTONYM_PAIRS.filter(([a, b]) => text.includes(a) || text.includes(b))
      if (!pairs.length) return null
      const [a, b] = pick(pairs, seed)
      return text.includes(a) ? text.replace(a, b) : text.replace(b, a)
    },
    // 3. 数字篡改（+1 / 改尾数），数字是硬事实，改了必错
    () => {
      const m = text.match(/\d+(?:\.\d+)?/)
      if (!m) return null
      const n = parseFloat(m[0])
      const delta = seed % 2 === 0 ? 1 : -1
      let nn = n + delta
      if (nn <= 0) nn = n + 1
      const rep = Number.isInteger(n) ? String(nn) : nn.toFixed(m[0].split('.')[1]?.length ?? 0)
      return text.replace(m[0], rep)
    },
    // 4. 枚举项替换：列表中混入外来项
    () => {
      for (const l of extractLists(text)) {
        if (l.items.length < 3) continue
        const victim = pick(l.items, seed)
        const foreign = swapSubjects.find((s) => s && !l.items.some((it) => it === s || it.includes(s) || s.includes(it)))
        if (foreign && victim && text.includes(victim)) return text.replace(victim, foreign)
      }
      return null
    },
  ]
  // 按种子轮转策略起点，保证不同题目用不同篡改方式
  for (let i = 0; i < strategies.length; i++) {
    const fn = strategies[(seed + i) % strategies.length]
    const out = fn()
    if (out && out !== text && out.length >= 8) return out
  }
  return null
}

// ================= 相关真题匹配（内容相关度） =================

const GENERIC = new Set([
  '系统', '软件', '架构', '技术', '方法', '设计', '管理', '包括', '下列', '正确', '错误', '属于',
  '主要', '关于', '说法', '的是', '工作', '功能', '进行', '通过', '采用', '实现', '提高', '保证',
  '应用', '数据', '处理', '服务', '模型', '过程', '方式', '特点', '组成', '结构', '能力', '称为',
  '中的', '对的', '模式', '开发', '分析', '以及', '之间', '可以', '需要', '使用', '不是',
  '一种', '用于', '负责', '支持', '描述', '如下', '有误', '合理',
])

function tokenize(text: string): Set<string> {
  const t = new Set<string>()
  for (const m of text.matchAll(/[A-Za-z][A-Za-z0-9+/.-]{1,15}|\d+(?:\.\d+)?%?/g)) {
    t.add(m[0].toUpperCase())
  }
  const han = text.replace(/[^一-龥]/g, ' ')
  for (const seg of han.split(/\s+/)) {
    for (let i = 0; i < seg.length - 1; i++) {
      const bg = seg.slice(i, i + 2)
      if (!GENERIC.has(bg)) t.add(bg)
    }
  }
  return t
}

export function findRelated(pointText: string, chapterId: number): MCQ[] {
  const pt = tokenize(pointText)
  const pool = mcqs.filter((m) => m.chapter === `第${chapterId}章`)
  const scored: { m: MCQ; score: number }[] = []
  for (const m of pool) {
    const stemT = tokenize(m.q)
    const bodyT = tokenize(m.explain + ' ' + m.options.join(' '))
    let stemHits = 0
    let bodyHits = 0
    for (const tk of pt) {
      if (stemT.has(tk)) stemHits++
      else if (bodyT.has(tk)) bodyHits++
    }
    if (stemHits >= 2 || (stemHits >= 1 && bodyHits >= 3)) {
      scored.push({ m, score: stemHits * 2 + bodyHits })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 2).map((x) => x.m)
}

// ================= 章节内枚举索引（干扰项来源） =================

const chapterLists = new Map<number, { key: string; items: string[] }[]>()

function listsOfChapter(chapterId: number) {
  if (!chapterLists.has(chapterId)) {
    const pts = chapterPoints(chapterId)
    const arr: { key: string; items: string[] }[] = []
    pts.forEach((p, i) => {
      for (const l of extractLists(p)) {
        arr.push({ key: `${chapterId}#${i}`, items: l.items })
      }
    })
    chapterLists.set(chapterId, arr)
  }
  return chapterLists.get(chapterId)!
}

function pickForeign(chapterId: number, selfKey: string, members: string[], pointText: string, seed: number): string | null {
  const candidates: string[] = []
  for (const l of listsOfChapter(chapterId)) {
    if (l.key === selfKey) continue
    for (const it of l.items) candidates.push(it)
  }
  const shuffled = seededShuffle([...new Set(candidates)], seed)
  for (const cand of shuffled) {
    if (pointText.includes(cand)) continue
    if (members.some((m) => m === cand || m.includes(cand) || cand.includes(m))) continue
    return cand
  }
  return null
}

// ================= 题目类型 =================

export type GenQuestion =
  | { kind: 'mcq'; id: string; mcq: MCQ }
  | { kind: 'member'; id: string; subject: string; members: string[]; foreign: string; options: string[]; answer: number }
  | { kind: 'order'; id: string; subject: string; direction: string; correct: string[]; options: string[][]; answer: number }

export const QUESTION_LABEL: Record<GenQuestion['kind'], string> = {
  mcq: '真题风格',
  member: '归属判断',
  order: '排序',
}

let synId = -1
function synMcq(q: string, correct: string, wrongs: string[], explain: string, seed: number): MCQ {
  const options = seededShuffle([correct, ...wrongs], seed)
  return {
    id: synId--,
    chapter: '',
    q,
    options: options as [string, string, string, string],
    answer: options.indexOf(correct),
    explain,
  }
}

// 生成一道概念辨析题。mode=right → 选正确项；mode=wrong → 选错误项
// 干扰项优先取同小节的知识点，保证题目"看起来像一回事"，不至于一眼排除
function buildJudge(
  mode: 'right' | 'wrong',
  selfText: string,
  seed: number,
  topic: string,
  swapPool: string[],
  sameSec: string[],
  others: string[],
): MCQ | null {
  // 同节优先，同节不足才用同章其他小节补足
  const siblingPool = [...seededShuffle(sameSec, seed + 9), ...seededShuffle(others, seed + 10)].filter(
    (s) => s !== selfText,
  )
  if (mode === 'right') {
    // 正确项=本知识点原文；干扰项=被篡改的同节知识点（必错）
    const wrongs: string[] = []
    for (let i = 0; i < siblingPool.length && wrongs.length < 3; i++) {
      const w = corruptText(siblingPool[i], seed + i * 13, swapPool)
      if (w && !wrongs.includes(w) && w !== selfText) wrongs.push(w)
    }
    if (wrongs.length < 3) return null
    return synMcq(
      `关于${topic}，下列说法正确的是（ ）。`,
      selfText,
      wrongs,
      `正确选项即本知识点原文。干扰项均为对同节其他知识点的篡改（张冠李戴/数字或方向被改动）。原文依据：${selfText}`,
      seed + 2,
    )
  }
  // 错误项=被篡改的本知识点；干扰项=同节真实表述（必对）
  const bad = corruptText(selfText, seed + 3, swapPool)
  if (!bad) return null
  const trues: string[] = []
  for (const s of siblingPool) {
    if (trues.length >= 3) break
    if (s !== bad && !trues.includes(s)) trues.push(s)
  }
  if (trues.length < 3) return null
  return synMcq(
    `关于${topic}，下列说法错误的是（ ）。`,
    bad,
    trues,
    `错误选项是被篡改过的表述（张冠李戴/数字或方向被改动）。正确原文应为：${selfText}`,
    seed + 5,
  )
}

export function generateQuestions(chapterId: number, sectionId: string, idx: number, text: string): GenQuestion[] {
  const key = `${chapterId}|${sectionId}|${idx}`
  const seed = hashStr(key)
  const qs: GenQuestion[] = []
  const ctx = sectionCtx(chapterId, sectionId)
  const topic = pointSubject(text, ctx.sectionTitle)

  // 干扰项素材池：全章主题词 + 同节兄弟知识点
  const allPts = chapterPoints(chapterId)
  const subjectPool = [
    ...new Set(
      allPts
        .map((p) => p.match(/^([^：:，。；]{2,15})：/)?.[1] ?? '')
        .filter((s) => s && s !== topic),
    ),
  ]
  const listTermPool = [
    ...new Set(listsOfChapter(chapterId).flatMap((l) => l.items)),
  ].filter((t) => !text.includes(t))
  const swapPool = [...subjectPool, ...listTermPool]
  // 兄弟知识点：同节优先，不够用同章其他节补足
  const sameSec = ctx.points.filter((p) => p !== text)
  const others = allPts.filter((p) => p !== text && !sameSec.includes(p))

  // 1. 内容匹配的历年真题风格选择题（最多 2 道）
  for (const m of findRelated(text, chapterId)) {
    qs.push({ kind: 'mcq', id: `${key}#q${m.id}`, mcq: m })
  }

  // 2. 概念辨析·选错误项（真题最高频题型）
  const judgeWrong = buildJudge('wrong', text, seed, topic, swapPool, sameSec, others)
  if (judgeWrong) qs.push({ kind: 'mcq', id: `${key}#jw`, mcq: judgeWrong })

  // 3. 概念辨析·选正确项
  const judgeRight = buildJudge('right', text, seed + 7, topic, swapPool, sameSec, others)
  if (judgeRight) qs.push({ kind: 'mcq', id: `${key}#jr`, mcq: judgeRight })

  // 4. 归属判断题（枚举 ≥3 项）：下列不属于…的是
  const lists = extractLists(text)
  const memberList = lists.find((l) => l.items.length >= 3)
  if (memberList) {
    const members = seededShuffle(memberList.items, seed).slice(0, 3)
    const foreign = pickForeign(chapterId, `${chapterId}#${idx}`, memberList.items, text, seed)
    if (foreign) {
      const options = seededShuffle([...members, foreign], seed + 5)
      qs.push({
        kind: 'member',
        id: `${key}#m`,
        subject: memberList.subject,
        members: memberList.items,
        foreign,
        options,
        answer: options.indexOf(foreign),
      })
    }
  }

  // 5. 排序题（有序枚举/序列 ≥4 项）
  const orderList = lists.find((l) => l.ordered && l.items.length >= 4)
  if (orderList) {
    const correct = orderList.items
    const wrongs: string[][] = []
    let s = seed + 11
    while (wrongs.length < 3 && s < seed + 200) {
      const w = seededShuffle(correct, s)
      if (w.join('|') !== correct.join('|') && !wrongs.some((x) => x.join('|') === w.join('|'))) {
        wrongs.push(w)
      }
      s += 7
    }
    if (wrongs.length >= 2) {
      const options = seededShuffle([correct, ...wrongs], seed + 3)
      qs.push({
        kind: 'order',
        id: `${key}#o`,
        subject: orderList.subject,
        direction: orderList.direction || '正确',
        correct,
        options,
        answer: options.findIndex((o) => o.join('|') === correct.join('|')),
      })
    }
  }

  // 不足 3 道：换种子再生成分辨析题补足（选项与篡改方式不同）
  let extra = 0
  while (qs.length < 3 && extra < 4) {
    const alt = buildJudge(extra % 2 === 0 ? 'right' : 'wrong', text, seed + 31 + extra * 17, topic, swapPool, sameSec, others)
    if (alt) qs.push({ kind: 'mcq', id: `${key}#jx${extra}`, mcq: alt })
    extra++
  }

  return qs.slice(0, 5)
}
