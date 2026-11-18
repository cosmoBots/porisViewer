// Minimal Chrome DevTools Protocol harness shared by the browser tests.
/* eslint-env node */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// How long Chrome may take to open its DevTools port. A cold CI runner can
// be slow to start it, so the default is generous; CHROME_START_TIMEOUT_MS
// overrides it.
const startTimeout = Number(process.env.CHROME_START_TIMEOUT_MS) || 30000

// Keeps only the end of Chrome's stderr, enough to explain a failed start.
const STDERR_TAIL_BYTES = 4096

// Launches headless Chrome (CHROME_BIN or google-chrome) with a throwaway
// profile and attaches to its first page. `exceptions` collects uncaught
// exceptions and unhandled rejections; `consoleErrors` collects console.error
// calls and browser log entries with level "error" (failed requests, CSP...).
// Both arrays can be emptied by the caller between checks.
export async function launchChrome({ windowSize = '1280,720', callTimeout = 10000 } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'poris-chrome-'))
  const chrome = spawn(
    process.env.CHROME_BIN || 'google-chrome',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      `--window-size=${windowSize}`,
      'about:blank'
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  // Always drain stderr so Chrome never blocks on a full pipe, but keep only
  // its tail for error messages.
  let stderrTail = ''
  chrome.stderr.setEncoding('utf8')
  chrome.stderr.on('data', (chunk) => {
    stderrTail = (stderrTail + chunk).slice(-STDERR_TAIL_BYTES)
  })
  const withStderr = (message) =>
    stderrTail.trim() ? `${message}\nChrome stderr (last lines):\n${stderrTail.trim()}` : message

  let spawnError
  let exitStatus
  const exited = new Promise((resolve) => {
    chrome.once('exit', (code, signal) => {
      exitStatus = signal ? `signal ${signal}` : `code ${code}`
      resolve()
    })
    chrome.once('error', (error) => {
      spawnError = error
      resolve()
    })
  })

  let socket
  const close = async () => {
    socket?.close()
    if (chrome.exitCode === null && chrome.signalCode === null && !spawnError) {
      chrome.kill('SIGTERM')
      const timer = setTimeout(() => chrome.kill('SIGKILL'), 5000)
      await exited
      clearTimeout(timer)
    }
    await rm(profile, { recursive: true, force: true })
  }

  try {
    // Wait for DevToolsActivePort, but stop at once if Chrome dies: a crash
    // and a slow start need different fixes, so they get different errors.
    const startDeadline = Date.now() + startTimeout
    let port
    while (!port && !spawnError && !exitStatus && Date.now() < startDeadline) {
      try {
        port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      } catch {
        /* Chrome is still starting. */
      }
      if (!port) await pause(100)
    }
    if (spawnError) throw new Error(`Chrome could not be launched: ${spawnError.message}`)
    if (!port && exitStatus) {
      throw new Error(withStderr(`Chrome exited before it was ready (${exitStatus})`))
    }
    if (!port) throw new Error(withStderr(`Chrome did not start within ${startTimeout} ms`))

    // Chrome may write DevToolsActivePort before its endpoint answers; bound
    // both the target lookup and the WebSocket handshake so that a stuck
    // endpoint fails (and is cleaned up below) instead of hanging the test.
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(callTimeout)
    })
      .then((response) => response.json())
      .catch((error) => {
        throw new Error(`DevTools endpoint did not answer: ${error.message}`)
      })
    const page = targets.find((t) => t.type === 'page')
    if (!page) throw new Error('Chrome exposes no page target')
    socket = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timeout: DevTools WebSocket did not open')),
        callTimeout
      )
      socket.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      socket.onerror = () => {
        clearTimeout(timer)
        reject(new Error('DevTools WebSocket could not connect'))
      }
    })

    let seq = 0
    const pending = new Map()
    const exceptions = []
    const consoleErrors = []
    socket.onmessage = ({ data }) => {
      const m = JSON.parse(data)
      if (m.method === 'Runtime.exceptionThrown') {
        const details = m.params.exceptionDetails
        exceptions.push(details.exception?.description || details.text)
      } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        consoleErrors.push(
          m.params.args.map((a) => a.description ?? a.value ?? a.unserializableValue).join(' ')
        )
      } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
        const { text, url } = m.params.entry
        consoleErrors.push(url ? `${text} (${url})` : text)
      }
      const request = pending.get(m.id)
      if (request) {
        pending.delete(m.id)
        m.error ? request.reject(new Error(m.error.message)) : request.resolve(m.result)
      }
    }

    const call = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`Timeout: ${method}`))
        }, callTimeout)
        pending.set(id, {
          resolve: (result) => {
            clearTimeout(timer)
            resolve(result)
          },
          reject: (error) => {
            clearTimeout(timer)
            reject(error)
          }
        })
        socket.send(JSON.stringify({ id, method, params }))
      })

    const evaluate = async (expression) => {
      const r = await call('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      })
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      }
      return r.result.value
    }

    // Polls `expression` until it is truthy, `timeout` expires or `abort()`
    // returns true; returns the last value of `expression`.
    const waitFor = async (
      expression,
      { timeout = 10000, interval = 100, abort = () => false } = {}
    ) => {
      const deadline = Date.now() + timeout
      let value = await evaluate(expression)
      while (!value && Date.now() < deadline && !abort()) {
        await pause(interval)
        value = await evaluate(expression)
      }
      return value
    }

    await call('Runtime.enable')
    await call('Page.enable')
    await call('Log.enable')
    return { call, evaluate, waitFor, exceptions, consoleErrors, close }
  } catch (error) {
    await close()
    throw error
  }
}
