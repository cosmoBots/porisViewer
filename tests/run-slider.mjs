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

let exitCode = 1
try {
  await server.listen()

  // Wait until the dev server answers and has transformed the test entry, so
  // that the browser test does not race the first dependency optimization.
  const deadline = Date.now() + 30000
  for (;;) {
    try {
      const page = await fetch(`${baseUrl}/tests/numeric-range.html`)
      const entry = await fetch(`${baseUrl}/tests/numeric-range.js`)
      if (page.ok && entry.ok) break
    } catch {
      /* The server is not answering yet. */
    }
    if (Date.now() > deadline) throw new Error(`Vite did not answer on ${baseUrl}`)
    await new Promise((resolve) => setTimeout(resolve, 200))
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
