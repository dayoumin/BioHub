import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', 'out')
const portArg = process.argv[2]
const port = Number.parseInt(portArg ?? process.env.PORT ?? '3200', 10)

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
} 

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const resolved = path.resolve(root, `.${normalized.startsWith(path.sep) ? normalized : `${path.sep}${normalized}`}`)
  return resolved.startsWith(root) ? resolved : null
}

async function resolveFilePath(urlPathname) {
  const pathname = decodeURIComponent(urlPathname)
  const candidate = safeJoin(rootDir, pathname)
  if (!candidate) {
    return null
  }

  const probes = []
  if (pathname.endsWith('/')) {
    probes.push(path.join(candidate, 'index.html'))
  } else {
    probes.push(candidate, `${candidate}.html`, path.join(candidate, 'index.html'))
  }

  for (const filePath of probes) {
    try {
      const fileStat = await stat(filePath)
      if (fileStat.isFile()) {
        return filePath
      }
    } catch {}
  }

  return null
}

async function assertOutExists() {
  await access(rootDir)
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const filePath = await resolveFilePath(requestUrl.pathname)

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }

    res.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': 'no-cache',
    })
    createReadStream(filePath).pipe(res)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Internal Server Error')
    console.error('[serve-static-out] request failed:', error)
  }
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0)
    })
  })
}

try {
  await assertOutExists()
  server.listen(port, () => {
    console.log(`[serve-static-out] serving ${rootDir} on http://localhost:${port}`)
  })
} catch (error) {
  console.error('[serve-static-out] failed to start:', error)
  process.exit(1)
}
