// Chrome harness shared by the browser tests, on top of puppeteer-core.
// Puppeteer launches Chrome, waits for it within a timeout, reports its
// output when it fails to start, and removes the temporary profile on close.
/* eslint-env node */
import puppeteer from 'puppeteer-core'

export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// How long Chrome may take to start. A cold CI runner can be slow, so the
// default is generous; CHROME_START_TIMEOUT_MS overrides it.
const startTimeout = Number(process.env.CHROME_START_TIMEOUT_MS) || 30000

// Launches headless Chrome (CHROME_BIN, or the installed stable Chrome) and
// returns helpers for its first page. `exceptions` collects uncaught
// exceptions and unhandled rejections; `consoleErrors` collects console.error
// calls and browser log entries with level "error" (failed requests, CSP...).
// Both arrays can be emptied by the caller between checks.
export async function launchChrome({ windowSize = '1280,720', callTimeout = 10000 } = {}) {
  const browser = await puppeteer.launch({
    ...(process.env.CHROME_BIN
      ? { executablePath: process.env.CHROME_BIN }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', `--window-size=${windowSize}`],
    defaultViewport: null,
    timeout: startTimeout,
    protocolTimeout: callTimeout
  })

  try {
    const [page = await browser.newPage()] = await browser.pages()
    page.setDefaultTimeout(callTimeout)

    const exceptions = []
    const consoleErrors = []
    page.on('pageerror', (error) => exceptions.push(error?.stack || String(error)))
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const { url } = message.location()
      const text = message.text()
      consoleErrors.push(url && !text.includes(url) ? `${text} (${url})` : text)
    })

    // Raw DevTools Protocol commands, for what the tests drive directly.
    const session = await page.createCDPSession()
    const call = (method, params = {}) => session.send(method, params)

    const goto = (url) => page.goto(url, { waitUntil: 'load' })

    const evaluate = (expression) => page.evaluate(expression)

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

    const close = () => browser.close()

    return { page, call, goto, evaluate, waitFor, exceptions, consoleErrors, close }
  } catch (error) {
    await browser.close()
    throw error
  }
}
