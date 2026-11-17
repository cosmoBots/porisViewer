// Starts the Vite dev server, runs tests/numeric-range-browser.mjs against it
// and always stops the server. Usage: npm run test:slider
/* eslint-env node */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const host = '127.0.0.1'
const port = 5189
const baseUrl = `http://${host}:${port}`

const server = await createServer({
  root,
  logLevel: 'warn',
  server: { host, port, strictPort: true }
})

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// Time left before `deadline`, capped at `cap` and never below 1 ms.
const remaining = (deadline, cap = Infinity) => Math.max(1, Math.min(cap, deadline - Date.now()))

// Fetches each URL and, recursively, every absolute or relative module it
// imports. Returns the sorted URL list, or null if any request failed. Each
// request is aborted after 10 s or at `deadline`, whichever comes first.
async function crawl(entries, deadline) {
  const seen = new Set()
  let ok = true
  const visit = async (url) => {
    if (seen.has(url)) return
    seen.add(url)
    try {
      const response = await fetch(baseUrl + url, {
        signal: AbortSignal.timeout(remaining(deadline, 10000))
      })
      const code = await response.text()
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      const imports = [...code.matchAll(/\b(?:from|import)\s*\(?\s*["']([./][^"']*)["']/g)]
      await Promise.all(
        imports.map(([, spec]) => {
          const target = new URL(spec, baseUrl + url)
          return visit(target.pathname + target.search)
        })
      )
    } catch {
      ok = false
    }
  }
  await Promise.all(entries.map(visit))
  return ok ? [...seen].sort().join('\n') : null
}

let exitCode = 1
try {
  await server.listen()

  // Load the test page's module graph the way the browser will, until two
  // passes in a row succeed with the same URLs. Vite rewrites prebundled
  // dependencies to URLs with a version query, so the list only settles once
  // dependency optimization (stale cache, newly discovered dependencies) is
  // over and the browser test cannot be hit by an optimizer reload.
  const deadline = Date.now() + 60000
  let previous = null
  for (;;) {
    const current = await crawl(
      ['/tests/numeric-range.html', '/@vite/client', '/tests/numeric-range.js'],
      deadline
    )
    // Vite has no timeout of its own here; never wait past the deadline. The
    // timer is unref'd so that it does not keep the process alive later.
    await Promise.race([
      server.waitForRequestsIdle?.(),
      new Promise((resolve) => setTimeout(resolve, remaining(deadline)).unref())
    ])
    if (current && previous === current) break
    if (previous) console.log('Waiting for Vite to finish optimizing dependencies...')
    if (Date.now() > deadline) throw new Error(`Vite did not settle on ${baseUrl}`)
    previous = current
    await pause(200)
  }

  const test = spawn(
    process.execPath,
    [fileURLToPath(new URL('numeric-range-browser.mjs', import.meta.url))],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, VIEWER_TEST_URL: baseUrl }
    }
  )
  exitCode = await new Promise((resolve) => {
    test.once('error', (error) => {
      console.error(error)
      resolve(1)
    })
    test.once('exit', (code, signal) => resolve(signal ? 1 : code))
  })
} catch (error) {
  console.error(error)
} finally {
  await server.close()
}
process.exitCode = exitCode
