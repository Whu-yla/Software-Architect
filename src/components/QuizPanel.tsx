import { useMemo, useState } from 'react'
import { RefreshCw, Star, Brain } from 'lucide-react'
import {
  generateQuestions,
  QUESTION_LABEL,
  type GenQuestion,
} from '../data/quizGen'
import type { MCQ } from '../data/exam'

const LETTERS = ['A', 'B', 'C', 'D']
const KIND_COLOR: Record<GenQuestion['kind'], string> = {
  member: 'bg-violet-50 text-violet-600 border-violet-200',
  order: 'bg-teal-50 text-teal-600 border-teal-200',
  mcq: 'bg-orange-50 text-orange-600 border-orange-200',
}

// ============ 选择题（归属判断 / 排序 通用） ============
function ChoiceQ({
  stem,
  options,
  answer,
  explain,
  onResult,
}: {
  stem: string
  options: string[]
  answer: number
  explain: string
  onResult: (r: 'right' | 'wrong' | null) => void
}) {
  const [chosen, setChosen] = useState<number | null>(null)
  const answered = chosen !== null
  return (
    <div>
      <p className="text-sm text-slate-700">{stem}</p>
      <div className="mt-2 grid gap-1.5">
        {options.map((opt, oi) => {
          let cls = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
          if (answered && oi === answer) cls = 'border-emerald-400 bg-emerald-50'
          else if (answered && oi === chosen) cls = 'border-red-300 bg-red-50'
          return (
            <button
              key={oi}
              disabled={answered}
              onClick={() => {
                setChosen(oi)
                onResult(oi === answer ? 'right' : 'wrong')
              }}
              className={`rounded border px-2.5 py-1.5 text-left text-xs text-slate-600 transition-colors ${cls}`}
            >
              <span className="font-medium text-slate-500">{LETTERS[oi]}.</span> {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="mt-2 text-xs text-slate-500">
          <span className={chosen === answer ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
            {chosen === answer ? '✓ 答对了' : '✗ 答错了'}
          </span>
          {'　'}
          {explain}
        </p>
      )}
    </div>
  )
}

// ============ 真题风格单选题（题库题 + 生成的概念辨析题） ============
function McqQ({ mcq, onResult }: { mcq: MCQ; onResult: (r: 'right' | 'wrong' | null) => void }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const answered = chosen !== null
  // 选项较长时单列排布，避免长句被挤压
  const twoCol = mcq.options.every((o) => o.length <= 30)
  return (
    <div>
      <p className="text-sm text-slate-700">{mcq.q}</p>
      <div className={`mt-2 grid gap-1.5 ${twoCol ? 'sm:grid-cols-2' : ''}`}>
        {mcq.options.map((opt, oi) => {
          let cls = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
          if (answered && oi === mcq.answer) cls = 'border-emerald-400 bg-emerald-50'
          else if (answered && oi === chosen) cls = 'border-red-300 bg-red-50'
          return (
            <button
              key={oi}
              disabled={answered}
              onClick={() => {
                setChosen(oi)
                onResult(oi === mcq.answer ? 'right' : 'wrong')
              }}
              className={`rounded border px-2.5 py-1.5 text-left text-xs text-slate-600 transition-colors ${cls}`}
            >
              <span className="font-medium text-slate-500">{LETTERS[oi]}.</span> {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="mt-2 text-xs text-slate-500">
          <span className={chosen === mcq.answer ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
            {chosen === mcq.answer ? '✓ 答对了' : '✗ 答错了'}
          </span>
          {'　'}
          {mcq.explain}
        </p>
      )}
    </div>
  )
}

// ============ 单题渲染 ============
function QuestionView({
  q,
  index,
  onResult,
}: {
  q: GenQuestion
  index: number
  onResult: (id: string, r: 'right' | 'wrong' | null) => void
}) {
  return (
    <div className="rounded-md bg-white border border-indigo-100 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">第 {index + 1} 题</span>
        <span className={`rounded-full border px-1.5 py-px text-[10px] ${KIND_COLOR[q.kind]}`}>
          {QUESTION_LABEL[q.kind]}
        </span>
      </div>
      {q.kind === 'member' && (
        <ChoiceQ
          stem={`关于「${q.subject}」，以下哪一项不属于它？`}
          options={q.options}
          answer={q.answer}
          explain={`「${q.foreign}」不属于。完整内容：${q.members.join('、')}`}
          onResult={(r) => onResult(q.id, r)}
        />
      )}
      {q.kind === 'order' && (
        <ChoiceQ
          stem={`「${q.subject}」按${q.direction === '正确' ? '正确顺序' : q.direction + '顺序'}排列，正确的是？`}
          options={q.options.map((o) => o.join(' → '))}
          answer={q.answer}
          explain={`正确顺序：${q.correct.join(' → ')}`}
          onResult={(r) => onResult(q.id, r)}
        />
      )}
      {q.kind === 'mcq' && <McqQ mcq={q.mcq} onResult={(r) => onResult(q.id, r)} />}
    </div>
  )
}

// ============ 出题面板 ============
interface Props {
  pointKey: string
  chapterId: number
  sectionId: string
  pointIdx: number
  pointText: string
  favored: boolean
  onFav: (key: string) => void
}

export default function QuizPanel({ pointKey, chapterId, sectionId, pointIdx, pointText, favored, onFav }: Props) {
  const questions = useMemo(
    () => generateQuestions(chapterId, sectionId, pointIdx, pointText),
    [chapterId, sectionId, pointIdx, pointText],
  )
  const [resetKey, setResetKey] = useState(0)
  const [results, setResults] = useState<Record<string, 'right' | 'wrong'>>({})

  const answered = Object.keys(results).length
  const wrong = Object.values(results).filter((r) => r === 'wrong').length

  const handleResult = (id: string, r: 'right' | 'wrong' | null) => {
    if (!r) return
    setResults((prev) => (prev[id] ? prev : { ...prev, [id]: r }))
  }

  const reset = () => {
    setResults({})
    setResetKey((k) => k + 1)
  }

  return (
    <div className="mt-1 ml-9 mr-1 rounded-lg border border-indigo-200 bg-indigo-50/50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-indigo-200/60 bg-indigo-50 px-3 py-1.5">
        <Brain className="h-3.5 w-3.5 text-indigo-600" />
        <span className="text-xs font-medium text-indigo-700">
          本知识点自测 · 共 {questions.length} 题
        </span>
        {answered > 0 && (
          <span className="text-[11px] text-slate-500">
            已做 {answered}/{questions.length}
            {wrong > 0 && <span className="text-red-500">，错 {wrong}</span>}
          </span>
        )}
        <button onClick={reset} className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600">
          <RefreshCw className="h-3 w-3" /> 重做
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5" key={resetKey}>
        {questions.map((q, qi) => (
          <QuestionView key={q.id} q={q} index={qi} onResult={handleResult} />
        ))}

        {/* 底部总结 */}
        {answered === questions.length && (
          <div className={`rounded-md border px-3 py-2 text-xs ${wrong === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {wrong === 0
              ? `🎉 ${questions.length} 题全对，这个知识点掌握得不错！`
              : `错了 ${wrong} 题，建议收藏这个知识点反复巩固 →`}
            {wrong > 0 &&
              (favored ? (
                <span className="ml-1 inline-flex items-center gap-1 text-yellow-700">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 已收藏
                </span>
              ) : (
                <button
                  onClick={() => onFav(pointKey)}
                  className="ml-1 inline-flex items-center gap-1 rounded-md bg-yellow-50 border border-yellow-300 px-2 py-0.5 text-yellow-700 hover:bg-yellow-100"
                >
                  <Star className="h-3 w-3" /> 一键收藏
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
