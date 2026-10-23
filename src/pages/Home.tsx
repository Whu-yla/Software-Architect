import { useEffect, useRef, useState } from 'react'
import { BookOpenCheck, ClipboardList, GraduationCap } from 'lucide-react'
import ReviewTab, { totalPoints } from '../sections/ReviewTab'
import ExamTab from '../sections/ExamTab'
import CaseEssayTab from '../sections/CaseEssayTab'
import { mcqs } from '../data/exam'
import { totalExamModulePoints } from '../data/caseEssayPoints'

const STORAGE_KEY = 'arch-exam-review-v1'
type Tab = 'review' | 'exam' | 'case'
type Checked = Record<string, boolean>
type Notes = Record<string, string>
type Favorites = Record<string, boolean>

interface ProgressData {
  checked: Checked
  notes: Notes
  favorites: Favorites
}

// 兼容旧格式：旧版 progress.json 是扁平的 {key: boolean}，或没有 favorites 字段
function normalize(data: unknown): ProgressData {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if ('checked' in d || 'notes' in d || 'favorites' in d) {
      return {
        checked: (d.checked as Checked) ?? {},
        notes: (d.notes as Notes) ?? {},
        favorites: (d.favorites as Favorites) ?? {},
      }
    }
    return { checked: d as Checked, notes: {}, favorites: {} }
  }
  return { checked: {}, notes: {}, favorites: {} }
}

function loadLocal(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalize(raw ? JSON.parse(raw) : null)
  } catch {
    return { checked: {}, notes: {}, favorites: {} }
  }
}

function countReal(c: Checked) {
  return Object.values(c).filter(Boolean).length
}

async function loadServer(): Promise<ProgressData | null> {
  try {
    const r = await fetch('/api/progress')
    if (!r.ok) return null
    return normalize(await r.json())
  } catch {
    return null // 静态部署（无服务端）时回退 localStorage
  }
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('review')
  const [data, setData] = useState<ProgressData>(loadLocal)
  const [synced, setSynced] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serverAvailable = useRef(false)

  // 启动时：以服务端文件为准（progress.json）；服务端为空但本地有数据则上传本地
  useEffect(() => {
    loadServer().then((server) => {
      if (server === null) {
        setSynced(true) // 纯静态模式，仅用 localStorage
        return
      }
      serverAvailable.current = true
      const local = loadLocal()
      const serverEmpty =
        countReal(server.checked) === 0 &&
        Object.keys(server.notes).length === 0 &&
        countReal(server.favorites) === 0
      const localEmpty =
        countReal(local.checked) === 0 &&
        Object.keys(local.notes).length === 0 &&
        countReal(local.favorites) === 0
      if (!serverEmpty || localEmpty) {
        setData(server)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(server))
      } else {
        // 服务端空、本地有：把本地进度推给服务端
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(local),
        }).catch(() => {})
      }
      setSynced(true)
    })
  }, [])

  // 变更时：立即写 localStorage，防抖 500ms 写服务端文件
  useEffect(() => {
    if (!synced) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (!serverAvailable.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {})
    }, 500)
  }, [data, synced])

  const toggle = (k: string) =>
    setData((p) => ({ ...p, checked: { ...p.checked, [k]: !p.checked[k] } }))
  const resetAll = () => setData({ checked: {}, notes: {}, favorites: {} })
  const setNote = (k: string, text: string) =>
    setData((p) => {
      const notes = { ...p.notes }
      if (text.trim()) notes[k] = text
      else delete notes[k]
      return { ...p, notes }
    })
  const toggleFav = (k: string) =>
    setData((p) => {
      const favorites = { ...p.favorites }
      if (favorites[k]) delete favorites[k]
      else favorites[k] = true
      return { ...p, favorites }
    })

  const total = totalPoints() + totalExamModulePoints()
  const done = countReal(data.checked)
  const noteCount = Object.keys(data.notes).length
  const favCount = countReal(data.favorites)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 顶部 */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center gap-3">
          <GraduationCap className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-lg font-bold leading-tight">系统架构设计师 · 复习宝典</h1>
            <p className="text-xs text-slate-500">
              依据《系统架构设计师教程（第2版）》 · {totalPoints()} 个上午知识点 + {totalExamModulePoints()} 个案例/论文知识点 · {mcqs.length} 道模拟选择题
            </p>
          </div>
          <nav className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {(
              [
                { key: 'review', label: '知识点复习', icon: BookOpenCheck },
                { key: 'exam', label: '模拟试卷·选择题', icon: ClipboardList },
                { key: 'case', label: '案例与论文', icon: GraduationCap },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 ${
                  tab === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'review' && (
          <>
            {done === total && total > 0 && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-700 font-medium">
                🎉 全部 {total} 个知识点已复习完毕！去做一套模拟卷检验一下吧。
              </div>
            )}
            <ReviewTab
              checked={data.checked}
              notes={data.notes}
              favorites={data.favorites}
              onToggle={toggle}
              onNote={setNote}
              onFav={toggleFav}
              onReset={resetAll}
              noteCount={noteCount}
              favCount={favCount}
            />
          </>
        )}
        {tab === 'exam' && <ExamTab />}
        {tab === 'case' && (
          <CaseEssayTab
            checked={data.checked}
            notes={data.notes}
            favorites={data.favorites}
            onToggle={toggle}
            onNote={setNote}
            onFav={toggleFav}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        进度与备注自动保存到本机 progress.json 文件 + 浏览器缓存双保险 · 考试科目：综合知识 75 题（150分钟）/ 案例分析（90分钟）/ 论文 4 选 1（120分钟），合格线均为 45 分
      </footer>
    </div>
  )
}
