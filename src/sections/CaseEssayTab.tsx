import { useState } from 'react'
import { caseQuestions, essayTopics } from '../data/exam'
import { caseModule, essayModule } from '../data/caseEssayPoints'
import { ChevronDown, ChevronRight, FileText, PenLine, Eye, EyeOff } from 'lucide-react'
import CaseEssayPoints from './CaseEssayPoints'

interface Props {
  checked: Record<string, boolean>
  notes: Record<string, string>
  favorites: Record<string, boolean>
  onToggle: (key: string) => void
  onNote: (key: string, text: string) => void
  onFav: (key: string) => void
}

export default function CaseEssayTab({ checked, notes, favorites, onToggle, onNote, onFav }: Props) {
  const [openCase, setOpenCase] = useState<Record<number, boolean>>({ 1: true })
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({})
  const [openEssay, setOpenEssay] = useState<Record<number, boolean>>({})

  const shared = { checked, notes, favorites, onToggle, onNote, onFav }

  return (
    <div className="space-y-10">
      {/* 案例分析知识点 */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800 border-l-4 border-indigo-500 pl-3">案例分析 · 知识点</h2>
          <p className="mt-1 text-sm text-slate-500 pl-4">
            先按主题把答题素材过一遍，再去做下面的模拟案例题。
          </p>
        </div>
        <CaseEssayPoints module={caseModule} {...shared} />
      </section>

      {/* 案例分析 */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800 border-l-4 border-indigo-500 pl-3">案例分析 · 模拟题（共 75 分）</h2>
          <p className="mt-1 text-sm text-slate-500 pl-4">
            正式考试规则：共 5 道大题，试题一必答，试题二至五任选 2 题作答，每题 25 分。本卷提供 1 道必答 + 2 道选答。
          </p>
        </div>
        <div className="space-y-4">
          {caseQuestions.map((cq) => {
            const open = !!openCase[cq.id]
            return (
              <div key={cq.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  onClick={() => setOpenCase((p) => ({ ...p, [cq.id]: !p[cq.id] }))}
                >
                  <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-800">{cq.title}</span>
                  {cq.required ? (
                    <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs text-red-600">必答</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">选答</span>
                  )}
                  {open ? <ChevronDown className="ml-auto h-4 w-4 text-slate-400" /> : <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />}
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm leading-relaxed text-slate-700">
                      <span className="font-medium text-slate-800">【背景材料】</span>
                      {cq.scenario}
                    </div>
                    <div className="mt-4 space-y-4">
                      {cq.questions.map((q, qi) => {
                        const key = `${cq.id}-${qi}`
                        const show = !!showAnswer[key]
                        return (
                          <div key={key} className="rounded-lg border border-slate-200">
                            <div className="px-4 py-3">
                              <p className="text-sm font-medium text-slate-800">
                                {q.sub}
                                <span className="ml-2 text-xs text-slate-400">（{q.score} 分）</span>
                              </p>
                            </div>
                            <div className="border-t border-slate-100 px-4 py-3">
                              <button
                                onClick={() => setShowAnswer((p) => ({ ...p, [key]: !p[key] }))}
                                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
                              >
                                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {show ? '收起参考答案' : '查看参考答案（先自己作答再对照）'}
                              </button>
                              {show && (
                                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm leading-relaxed text-slate-700">
                                  {q.answer}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 论文知识点 */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800 border-l-4 border-indigo-500 pl-3">论文 · 知识点</h2>
          <p className="mt-1 text-sm text-slate-500 pl-4">
            写作框架 + 高频主题素材，每个主题提前准备好自己的项目例子。
          </p>
        </div>
        <CaseEssayPoints module={essayModule} {...shared} />
      </section>

      {/* 论文 */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800 border-l-4 border-indigo-500 pl-3">论文 · 模拟题（4 选 1，75 分）</h2>
          <p className="mt-1 text-sm text-slate-500 pl-4">
            考试时间 120 分钟，摘要 300-400 字 + 正文 2000-2500 字。建议选 1 题完整手写一遍练手感。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {essayTopics.map((t) => {
            const open = !!openEssay[t.id]
            return (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  onClick={() => setOpenEssay((p) => ({ ...p, [t.id]: !p[t.id] }))}
                >
                  <PenLine className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-800">{t.title}</span>
                  {open ? <ChevronDown className="ml-auto h-4 w-4 text-slate-400" /> : <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />}
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-2">【试题要求】</div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
                        {t.requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                      <div className="text-xs font-semibold text-indigo-600 mb-2">【写作提示】</div>
                      <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                        {t.hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
