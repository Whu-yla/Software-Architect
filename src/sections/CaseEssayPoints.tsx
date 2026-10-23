// 案例/论文知识点列表：与复习页同款交互（勾选掌握、考频星级、出题、收藏、备注）
import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageSquareText,
  Star,
  Brain,
} from 'lucide-react'
import type { ExamModule } from '../data/caseEssayPoints'
import { getStars } from '../data/stars'
import { StarRating } from './ReviewTab'
import NoteEditor, { MarkdownView } from '../components/NoteEditor'
import QuizPanel from '../components/QuizPanel'

interface Props {
  module: ExamModule
  checked: Record<string, boolean>
  notes: Record<string, string>
  favorites: Record<string, boolean>
  onToggle: (key: string) => void
  onNote: (key: string, text: string) => void
  onFav: (key: string) => void
}

export default function CaseEssayPoints({
  module: mod,
  checked,
  notes,
  favorites,
  onToggle,
  onNote,
  onFav,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})
  const [openQuiz, setOpenQuiz] = useState<Record<string, boolean>>({})
  const [noteExpanded, setNoteExpanded] = useState<Record<string, boolean>>({})

  const totalPts = mod.sections.reduce((s, sec) => s + sec.points.length, 0)
  const donePts = mod.sections.reduce(
    (s, sec) => s + sec.points.filter((_, i) => checked[`${mod.id}|${sec.id}|${i}`]).length,
    0,
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <h3 className="font-semibold text-slate-800">{mod.title}</h3>
        <span className="text-xs text-slate-400">{donePts}/{totalPts} 已掌握</span>
        {donePts === totalPts && totalPts > 0 && (
          <span className="text-xs text-emerald-600 font-medium">✓ 全部掌握</span>
        )}
      </div>
      <p className="px-5 pt-3 text-xs leading-relaxed text-slate-500">{mod.intro}</p>
      <div className="px-2 py-2">
        {mod.sections.map((sec) => {
          const sopen = !!openSections[sec.id]
          const sd = sec.points.filter((_, i) => checked[`${mod.id}|${sec.id}|${i}`]).length
          return (
            <div key={sec.id} className="rounded-lg">
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={() => setOpenSections((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
              >
                {sopen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {sec.id} {sec.title}
                </span>
                <span
                  className={`ml-auto text-xs ${sd === sec.points.length ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  {sd}/{sec.points.length}
                </span>
              </button>
              {sopen && (
                <ul className="px-4 pb-3 space-y-1.5">
                  {sec.points.map((p, i) => {
                    const k = `${mod.id}|${sec.id}|${i}`
                    const on = !!checked[k]
                    const fav = !!favorites[k]
                    const star = getStars(mod.id, sec.id, i)
                    const note = notes[k] ?? ''
                    const noteOpen = !!openNotes[k]
                    return (
                      <li key={k} data-point={k}>
                        <div
                          className={`flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-sm transition-all ${
                            fav
                              ? 'bg-yellow-50/70 border-yellow-200'
                              : on
                                ? 'bg-emerald-50'
                                : 'bg-white hover:bg-indigo-50'
                          } border border-slate-100`}
                        >
                          <button
                            onClick={() => onToggle(k)}
                            className="shrink-0 mt-0.5"
                            title={on ? '取消掌握' : '标记已掌握'}
                          >
                            {on ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300" />
                            )}
                          </button>
                          <button
                            onClick={() => onToggle(k)}
                            className={`flex-1 text-left ${on ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'}`}
                          >
                            {p}
                          </button>
                          <StarRating level={star} />
                          <button
                            onClick={() => setOpenQuiz((prev) => ({ ...prev, [k]: !prev[k] }))}
                            title="出题考我"
                            className={`shrink-0 mt-0.5 rounded p-0.5 transition-colors ${
                              openQuiz[k]
                                ? 'text-indigo-600 bg-indigo-50'
                                : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'
                            }`}
                          >
                            <Brain className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onFav(k)}
                            title={fav ? '取消收藏' : '收藏（常记错）'}
                            className={`shrink-0 mt-0.5 rounded p-0.5 transition-colors ${
                              fav
                                ? 'text-yellow-500 hover:bg-yellow-50'
                                : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${fav ? 'fill-yellow-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => setOpenNotes((prev) => ({ ...prev, [k]: !prev[k] }))}
                            title={note ? '查看/编辑备注' : '添加备注'}
                            className={`shrink-0 mt-0.5 rounded p-0.5 transition-colors ${
                              note
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </button>
                        </div>
                        {openQuiz[k] && (
                          <QuizPanel
                            pointKey={k}
                            chapterId={mod.id}
                            sectionId={sec.id}
                            pointIdx={i}
                            pointText={p}
                            favored={fav}
                            onFav={onFav}
                          />
                        )}
                        {noteOpen && (
                          <div className="mt-1 ml-9 mr-1">
                            <NoteEditor value={note} autoFocus onChange={(text) => onNote(k, text)} />
                          </div>
                        )}
                        {!noteOpen && note && !noteExpanded[k] && (
                          <div className="mt-1 ml-9 mr-1 flex items-center gap-1.5">
                            <button
                              onClick={() => setNoteExpanded((prev) => ({ ...prev, [k]: true }))}
                              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600 hover:bg-amber-100"
                              title="展开备注"
                            >
                              <MessageSquareText className="h-3 w-3" /> 备注
                            </button>
                          </div>
                        )}
                        {!noteOpen && note && noteExpanded[k] && (
                          <div className="mt-1 ml-9 mr-1 rounded-md border border-amber-100 bg-amber-50/50 overflow-hidden">
                            <div className="flex items-center justify-end gap-1 bg-amber-50 border-b border-amber-100 px-2 py-0.5">
                              <button
                                onClick={() => setOpenNotes((prev) => ({ ...prev, [k]: true }))}
                                className="text-[11px] text-amber-600 hover:text-amber-800 px-1"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => setNoteExpanded((prev) => ({ ...prev, [k]: false }))}
                                className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-600 px-1"
                                title="最小化"
                              >
                                <ChevronUp className="h-3 w-3" /> 收起
                              </button>
                            </div>
                            <button
                              onClick={() => setOpenNotes((prev) => ({ ...prev, [k]: true }))}
                              className="block w-full px-3 py-1.5 text-left"
                            >
                              <MarkdownView text={note} compact />
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
