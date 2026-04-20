import { createReadStream } from 'node:fs'
import { access, readFile, stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', 'out')
const portArg = process.argv[2]
const port = Number.parseInt(portArg ?? process.env.PORT ?? '3200', 10)
const serverUrl = `http://localhost:${port}`
const REUSE_PROBE_TIMEOUT_MS = 2_000
let isReusingExistingServer = false
let holdRef = null
let expectedIndexHtml = null

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
  expectedIndexHtml = await readFile(path.join(rootDir, 'index.html'), 'utf8')
}

async function isServerReachable() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REUSE_PROBE_TIMEOUT_MS)

  try {
    const response = await fetch(serverUrl, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    })
    if (!response.ok) {
      return false
    }

    const responseBody = await response.text()
    return expectedIndexHtml !== null && responseBody === expectedIndexHtml
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

async function waitForExistingServer(timeoutMs = 10_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return false
}

function holdProcessOpen() {
  return setInterval(() => {}, 60_000)
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
    if (isReusingExistingServer) {
      if (holdRef) {
        clearInterval(holdRef)
      }
      process.exit(0)
    }
    server.close(() => {
      process.exit(0)
    })
  })
}

server.on('error', async (error) => {
  if (error?.code === 'EADDRINUSE') {
    const reachable = await waitForExistingServer()
    if (reachable) {
      isReusingExistingServer = true
      console.log(`[serve-static-out] reusing existing server on ${serverUrl}`)
      holdRef = holdProcessOpen()
      return
    }
  }

  console.error('[serve-static-out] failed to start:', error)
  process.exit(1)
})

try {
  await assertOutExists()
  server.listen(port, () => {
    console.log(`[serve-static-out] serving ${rootDir} on ${serverUrl}`)
  })
} catch (error) {
  console.error('[serve-static-out] failed to start:', error)
  process.exit(1)
}
