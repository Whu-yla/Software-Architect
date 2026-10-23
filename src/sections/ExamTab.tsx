import { useMemo, useState } from 'react'
import { mcqs } from '../data/exam'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

type Mode = 'practice' | 'exam'
const LETTERS = ['A', 'B', 'C', 'D']

export default function ExamTab() {
  const [mode, setMode] = useState<Mode>('practice')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [onlyWrong, setOnlyWrong] = useState(false)
  const [chapterFilter, setChapterFilter] = useState<string>('all')

  const chapterList = useMemo(() => Array.from(new Set(mcqs.map((m) => m.chapter))), [])

  const score = useMemo(
    () => mcqs.reduce((s, m) => s + (answers[m.id] === m.answer ? 1 : 0), 0),
    [answers],
  )
  const answeredCount = Object.keys(answers).length

  const visible = mcqs.filter((m) => {
    if (chapterFilter !== 'all' && m.chapter !== chapterFilter) return false
    if (submitted && onlyWrong && answers[m.id] === m.answer) return false
    return true
  })

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
    setOnlyWrong(false)
  }

  return (
    <div>
      {/* 控制栏 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              onClick={() => { setMode('practice'); reset() }}
              className={`px-4 py-2 ${mode === 'practice' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              练习模式（即时判题）
            </button>
            <button
              onClick={() => { setMode('exam'); reset() }}
              className={`px-4 py-2 ${mode === 'exam' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              考试模式（交卷判分）
            </button>
          </div>
          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            <option value="all">全部章节（{mcqs.length} 题）</option>
            {chapterList.map((c) => (
              <option key={c} value={c}>
                {c}（{mcqs.filter((m) => m.chapter === c).length} 题）
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">已答 {answeredCount}/{mcqs.length}</span>
          {mode === 'exam' && !submitted && (
            <button
              onClick={() => {
                if (answeredCount < mcqs.length && !window.confirm(`还有 ${mcqs.length - answeredCount} 题未作答，确定交卷吗？`)) return
                setSubmitted(true)
              }}
              className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              交卷
            </button>
          )}
          {(submitted || answeredCount > 0) && (
            <button
              onClick={() => { if (window.confirm('清空本次作答记录？')) reset() }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重新作答
            </button>
          )}
        </div>

        {submitted && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">得分</div>
              <div className={`text-3xl font-bold ${score >= 45 ? 'text-emerald-600' : 'text-red-500'}`}>
                {score} <span className="text-base font-normal text-slate-400">/ {mcqs.length}</span>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {score >= 45 ? '🎉 已达合格线（45分）' : '💪 未达合格线（45分），继续加油'}
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="rounded" />
              只看错题
            </label>
          </div>
        )}
      </div>

      {/* 题目列表 */}
      <div className="space-y-4">
        {visible.map((m) => {
          const chosen = answers[m.id]
          const reveal = mode === 'practice' ? chosen !== undefined : submitted
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{m.chapter}</span>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {m.id}. {m.q}
                </p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {m.options.map((opt, oi) => {
                  const isChosen = chosen === oi
                  const isCorrect = m.answer === oi
                  let cls = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                  if (reveal && isCorrect) cls = 'border-emerald-400 bg-emerald-50'
                  else if (reveal && isChosen && !isCorrect) cls = 'border-red-300 bg-red-50'
                  else if (isChosen) cls = 'border-indigo-400 bg-indigo-50'
                  return (
                    <button
                      key={oi}
                      disabled={reveal}
                      onClick={() => setAnswers((p) => ({ ...p, [m.id]: oi }))}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${cls} ${reveal ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="font-semibold text-slate-500">{LETTERS[oi]}.</span>
                      <span className="text-slate-700">{opt}</span>
                      {reveal && isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
                      {reveal && isChosen && !isCorrect && <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />}
                    </button>
                  )
                })}
              </div>
              {reveal && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium text-amber-700">解析：</span>
                  {m.explain}
                  {chosen === undefined && <span className="ml-2 text-red-500">（未作答）</span>}
                </div>
              )}
            </div>
          )
        })}
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            没有符合条件的题目
          </div>
        )}
      </div>
    </div>
  )
}
