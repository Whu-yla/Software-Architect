import { useRef, useState } from 'react'
import { marked } from 'marked'
import { Eye, PencilLine, ImagePlus, Loader2 } from 'lucide-react'

marked.setOptions({ breaks: true, gfm: true })

export function MarkdownView({ text, compact }: { text: string; compact?: boolean }) {
  const html = marked.parse(text, { async: false }) as string
  return (
    <div
      className={`md-body ${compact ? 'md-compact' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

interface Props {
  value: string
  onChange: (text: string) => void
  autoFocus?: boolean
}

export default function NoteEditor({ value, onChange, autoFocus }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [uploading, setUploading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (snippet: string) => {
    const ta = taRef.current
    if (!ta) {
      onChange(value + snippet)
      return
    }
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    const next = value.slice(0, start) + snippet + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + snippet.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const uploadFile = async (file: File | Blob, name?: string) => {
    setUploading(true)
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'image/png',
          'X-Filename': name || 'paste.png',
        },
        body: file,
      })
      const data = await res.json()
      if (data.ok && data.url) {
        insertAtCursor(`\n![截图](${data.url})\n`)
      }
    } catch {
      // 静态模式下无服务端，忽略
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) uploadFile(file)
        return
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      e.preventDefault()
      uploadFile(file, file.name)
    }
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 border-b border-amber-200/70 bg-amber-50 px-2 py-1">
        <button
          onClick={() => setMode('edit')}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs ${mode === 'edit' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-700'}`}
        >
          <PencilLine className="h-3 w-3" /> 编辑
        </button>
        <button
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs ${mode === 'preview' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-700'}`}
        >
          <Eye className="h-3 w-3" /> 预览
        </button>
        <span className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
          {uploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> 图片上传中…
            </>
          ) : (
            <>
              <ImagePlus className="h-3 w-3" /> 支持 Markdown · Ctrl+V 粘贴或拖入截图
            </>
          )}
        </span>
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={taRef}
          value={value}
          autoFocus={autoFocus}
          rows={Math.min(10, Math.max(3, value.split('\n').length + 1))}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder={'写下你的理解、口诀、疑问……\n支持 **加粗**、列表、代码、`公式`，可直接粘贴截图'}
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none resize-y font-mono leading-relaxed"
        />
      ) : (
        <div className="px-3 py-2 min-h-[60px]">
          {value.trim() ? (
            <MarkdownView text={value} />
          ) : (
            <span className="text-sm text-slate-400">（暂无内容）</span>
          )}
        </div>
      )}
    </div>
  )
}
