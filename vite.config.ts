import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// 复习进度持久化：把勾选状态写到项目根目录 progress.json，
// 不依赖浏览器 localStorage（预览端口/域名变化也不会丢）
function progressStore(): Plugin {
  const file = path.resolve(__dirname, "./progress.json")
  const imgDir = path.resolve(__dirname, "./notes-images")
  const extMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  }
  const read = () => {
    try {
      return fs.readFileSync(file, "utf-8")
    } catch {
      return "{}"
    }
  }
  return {
    name: "progress-store",
    configureServer(server) {
      // 进度读写
      server.middlewares.use("/api/progress", (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        if (req.method === "GET") {
          res.end(read())
          return
        }
        if (req.method === "POST") {
          let body = ""
          req.on("data", (c) => (body += c))
          req.on("end", () => {
            try {
              JSON.parse(body) // 校验合法 JSON
              fs.writeFileSync(file, body, "utf-8")
              res.end('{"ok":true}')
            } catch {
              res.statusCode = 400
              res.end('{"ok":false}')
            }
          })
          return
        }
        res.statusCode = 405
        res.end("{}")
      })

      // 备注图片上传：POST 原始二进制，保存到 notes-images/，返回可访问 URL
      server.middlewares.use("/api/upload-image", (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8")
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end('{"ok":false}')
          return
        }
        const ct = String(req.headers["content-type"] || "")
        const ext =
          Object.entries(extMap).find(([, mime]) => ct.includes(mime))?.[0] ||
          (/\.(png|jpe?g|gif|webp)$/i.exec(String(req.headers["x-filename"] || ""))?.[0].toLowerCase()) ||
          ".png"
        const name = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
        try {
          fs.mkdirSync(imgDir, { recursive: true })
        } catch {}
        const chunks: Buffer[] = []
        req.on("data", (c) => chunks.push(c))
        req.on("end", () => {
          try {
            fs.writeFileSync(path.join(imgDir, name), Buffer.concat(chunks))
            res.end(JSON.stringify({ ok: true, url: `/api/images/${name}` }))
          } catch {
            res.statusCode = 500
            res.end('{"ok":false}')
          }
        })
      })

      // 备注图片访问
      server.middlewares.use("/api/images", (req, res) => {
        const name = path.basename(decodeURIComponent((req.url || "").split("?")[0]))
        const full = path.join(imgDir, name)
        const ext = path.extname(name).toLowerCase()
        if (!extMap[ext] || !fs.existsSync(full)) {
          res.statusCode = 404
          res.end("not found")
          return
        }
        res.setHeader("Content-Type", extMap[ext])
        res.setHeader("Cache-Control", "max-age=31536000, immutable")
        fs.createReadStream(full).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), progressStore()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
