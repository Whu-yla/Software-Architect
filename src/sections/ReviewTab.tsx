import { useEffect, useMemo, useRef, useState } from 'react'
import { chapters } from '../data/chapters'
import { getStars, STAR_LABEL } from '../data/stars'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, ChevronUp, RotateCcw, MessageSquareText, Star, Brain } from 'lucide-react'
import NoteEditor, { MarkdownView } from '../components/NoteEditor'
import QuizPanel from '../components/QuizPanel'

// 界面状态记忆：章节展开情况 + 最后操作的知识点，刷新后恢复
const UI_KEY = 'arch-exam-ui-v1'
interface UiState {
  openChapters?: Record<number, boolean>
  lastKey?: string
}
function loadUI(): UiState {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || '{}')
  } catch {
    return {}
  }
}

interface Props {
  checked: Record<string, boolean>
  notes: Record<string, string>
  favorites: Record<string, boolean>
  noteCount: number
  favCount: number
  onToggle: (key: string) => void
  onNote: (key: string, text: string) => void
  onFav: (key: string) => void
  onReset: () => void
}

export const pointKey = (chapterId: number, sectionId: string, idx: number) =>
  `${chapterId}|${sectionId}|${idx}`

export function totalPoints() {
  return chapters.reduce((s, c) => s + c.sections.reduce((ss, sec) => ss + sec.points.length, 0), 0)
}

// 单个知识点的考频星级（1-5）
export function StarRating({ level }: { level: number }) {
  return (
    <span className="shrink-0 mt-0.5 text-[10px] leading-none tracking-tighter cursor-help" title={`考频 ${level}/5：${STAR_LABEL[level] ?? ''}`}>
      <span className="text-yellow-400">{'★'.repeat(level)}</span>
      <span className="text-slate-200">{'★'.repeat(5 - level)}</span>
    </span>
  )
}

export default function ReviewTab({ checked, notes, favorites, noteCount, favCount, onToggle, onNote, onFav, onReset }: Props) {
  const initialUI = useMemo(loadUI, [])
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>(() => {
    if (initialUI.openChapters && Object.keys(initialUI.openChapters).length > 0) return initialUI.openChapters
    if (initialUI.lastKey) return { [Number(initialUI.lastKey.split('|')[0])]: true }
    return {}
  })
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})
  const [openQuiz, setOpenQuiz] = useState<Record<string, boolean>>({})
  const [noteExpanded, setNoteExpanded] = useState<Record<string, boolean>>({})
  const [minStars, setMinStars] = useState<0 | 3 | 4 | 5>(0)
  const [onlyFav, setOnlyFav] = useState(false)
  const lastKeyRef = useRef<string | undefined>(initialUI.lastKey)

  // 记录最后操作的知识点并持久化界面状态
  const persistUI = (lastKey?: string) => {
    const state: UiState = { openChapters, lastKey: lastKey ?? lastKeyRef.current }
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(state))
    } catch {}
  }
  const touch = (k: string) => {
    lastKeyRef.current = k
    persistUI(k)
  }

  // 章节展开状态变化时同步保存
  useEffect(() => {
    persistUI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChapters])

  // 首次加载：滚动到最后操作的知识点并短暂高亮（重试轮询，直到目标渲染完成；直接操作 DOM 保证生效）
  useEffect(() => {
    const k = initialUI.lastKey
    if (!k) return
    let tries = 0
    let clearT: ReturnType<typeof setTimeout> | undefined
    const iv = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-point="${CSS.escape(k)}"]`)
      if (el && el.firstElementChild) {
        clearInterval(iv)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const row = el.firstElementChild as HTMLElement
        const orig = row.className
        row.className = 'flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-sm transition-all ring-2 ring-indigo-400 bg-indigo-50 border border-indigo-200'
        clearT = setTimeout(() => {
          // 若期间 React 重新渲染过（className 被重置），无需恢复
          if (row.className.includes('ring-indigo-400')) row.className = orig
        }, 2600)
      } else if (++tries > 25) {
        clearInterval(iv)
      }
    }, 200)
    return () => {
      clearInterval(iv)
      if (clearT) clearTimeout(clearT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    let total = 0
    let done = 0
    let hiTotal = 0 // 4-5星高频考点数
    let hiDone = 0
    const perChapter: Record<number, { total: number; done: number; hiTotal: number; hiDone: number }> = {}
    for (const c of chapters) {
      let ct = 0, cd = 0, ht = 0, hd = 0
      for (const sec of c.sections) {
        sec.points.forEach((_, i) => {
          total++
          ct++
          const s = getStars(c.id, sec.id, i)
          if (s >= 4) {
            hiTotal++
            ht++
          }
          if (checked[pointKey(c.id, sec.id, i)]) {
            done++
            cd++
            if (s >= 4) {
              hiDone++
              hd++
            }
          }
        })
      }
      perChapter[c.id] = { total: ct, done: cd, hiTotal: ht, hiDone: hd }
    }
    return { total, done, hiTotal, hiDone, perChapter }
  }, [checked])

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
  const hiPct = stats.hiTotal ? Math.round((stats.hiDone / stats.hiTotal) * 100) : 0
  const filtering = minStars > 0 || onlyFav
  // 知识点是否通过当前筛选
  const passPoint = (cid: number, secId: string, i: number) => {
    if (minStars > 0 && getStars(cid, secId, i) < minStars) return false
    if (onlyFav && !favorites[pointKey(cid, secId, i)]) return false
    return true
  }

  return (
    <div>
      {/* 总进度 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">复习总进度（共 {stats.total} 个知识点）</div>
            <div className="text-2xl font-bold text-slate-800">
              {stats.done} / {stats.total}
              <span className="ml-2 text-base font-normal text-indigo-600">{pct}%</span>
              {noteCount > 0 && (
                <span className="ml-3 inline-flex items-center gap-1 text-base font-normal text-amber-600">
                  <MessageSquareText className="h-4 w-4" /> {noteCount} 条备注
                </span>
              )}
              {favCount > 0 && (
                <span className="ml-3 inline-flex items-center gap-1 text-base font-normal text-yellow-600">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {favCount} 个收藏
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              高频考点（4-5星）掌握：
              <span className={hiPct >= 80 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {stats.hiDone}/{stats.hiTotal}（{hiPct}%）
              </span>
              <span className="ml-2 text-slate-400">考频 5星=必考核心 · 4星=高频 · 3星=隔年 · 2星=低频 · 1星=极少</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyFav((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                onlyFav
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${onlyFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              只看收藏
            </button>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {([0, 3, 4, 5] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMinStars(f)}
                  className={`px-3 py-1.5 ${minStars === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {f === 0 ? '全部' : f === 5 ? '仅5星' : `≥${f}星`}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (window.confirm('确定要清空所有复习进度和备注吗？')) onReset()
              }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重置进度
            </button>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 章节列表 */}
      {filtering && onlyFav && favCount === 0 && (
        <div className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50/50 p-10 text-center text-slate-500">
          <Star className="mx-auto mb-2 h-8 w-8 text-yellow-300" />
          还没有收藏任何知识点。遇到常记错的知识点，点它右侧的 ☆ 收藏起来。
        </div>
      )}
      {(['上篇·基础知识', '下篇·架构设计理论与实践'] as const).map((part) => {
        const list = chapters.filter((c) => {
          if (c.part !== part) return false
          if (!filtering) return true
          return c.sections.some((sec) => sec.points.some((_, i) => passPoint(c.id, sec.id, i)))
        })
        if (!list.length) return null
        return (
          <div key={part} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-800 border-l-4 border-indigo-500 pl-3">{part}</h2>
            <div className="space-y-3">
              {list.map((c) => {
                const st = stats.perChapter[c.id]
                const cpct = st.total ? Math.round((st.done / st.total) * 100) : 0
                const open = filtering ? true : !!openChapters[c.id]
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <button
                      className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                      onClick={() => setOpenChapters((p) => ({ ...p, [c.id]: !p[c.id] }))}
                    >
                      {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <span className="font-medium text-slate-800">
                        第{c.id}章 {c.title}
                      </span>
                      <span className="hidden md:inline text-xs text-slate-400">{c.examNote}</span>
                      <span className="ml-auto flex items-center gap-3 shrink-0">
                        <span className="text-xs text-yellow-600" title="本章4-5星高频考点掌握情况">
                          高频 {st.hiDone}/{st.hiTotal}
                        </span>
                        <span className="text-xs text-slate-500">
                          {st.done}/{st.total}
                        </span>
                        <span className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${cpct === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                            style={{ width: `${cpct}%` }}
                          />
                        </span>
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                        {c.sections
                          .filter((sec) => !filtering || sec.points.some((_, i) => passPoint(c.id, sec.id, i)))
                          .map((sec) => {
                          const skey = `${c.id}-${sec.id}`
                          const sopen = openSections[skey] !== false // 默认展开
                          const sd = sec.points.filter((_, i) => checked[pointKey(c.id, sec.id, i)]).length
                          return (
                            <div key={sec.id} className="rounded-lg border border-slate-100 bg-slate-50/50">
                              <button
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
                                onClick={() => setOpenSections((p) => ({ ...p, [skey]: !sopen }))}
                              >
                                {sopen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                <span className="text-sm font-medium text-slate-700">
                                  {sec.id} {sec.title}
                                </span>
                                <span className={`ml-auto text-xs ${sd === sec.points.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {sd}/{sec.points.length}
                                </span>
                              </button>
                              {sopen && (
                                <ul className="px-4 pb-3 space-y-1.5">
                                  {sec.points
                                    .map((p, i) => ({ p, i }))
                                    .filter(({ i }) => passPoint(c.id, sec.id, i))
                                    .map(({ p, i }) => {
                                    const k = pointKey(c.id, sec.id, i)
                                    const on = !!checked[k]
                                    const fav = !!favorites[k]
                                    const star = getStars(c.id, sec.id, i)
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
                                          <button onClick={() => { touch(k); onToggle(k) }} className="shrink-0 mt-0.5" title={on ? '取消掌握' : '标记已掌握'}>
                                            {on ? (
                                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-slate-300" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => { touch(k); onToggle(k) }}
                                            className={`flex-1 text-left ${on ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'}`}
                                          >
                                            {p}
                                          </button>
                                          <StarRating level={star} />
                                          <button
                                            onClick={() => { touch(k); setOpenQuiz((prev) => ({ ...prev, [k]: !prev[k] })) }}
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
                                            onClick={() => { touch(k); onFav(k) }}
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
                                            onClick={() => { touch(k); setOpenNotes((prev) => ({ ...prev, [k]: !prev[k] })) }}
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
                                            chapterId={c.id}
                                            sectionId={sec.id}
                                            pointIdx={i}
                                            pointText={p}
                                            favored={fav}
                                            onFav={onFav}
                                          />
                                        )}
                                        {noteOpen && (
                                          <div className="mt-1 ml-9 mr-1">
                                            <NoteEditor
                                              value={note}
                                              autoFocus
                                              onChange={(text) => onNote(k, text)}
                                            />
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
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
