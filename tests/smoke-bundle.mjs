// Smoke test of the bundle shipped to the cosmoSys plugin. It builds the
// csys-plugin bundle into a temporary directory, checks what the plugin
// deployment checks, then mounts every model of public/models/ with the built
// module in headless Chrome. Usage: npm run test:smoke
/* eslint-env node */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, pause } from './cdp.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const modelsDir = join(root, 'public', 'models')

// Models that are known not to render, with the reason. Keep this explicit:
// a model listed here is reported as SKIP, never silently ignored.
const EXCLUDED = new Map([])

// The page loads the bundle the same way the plugin does: an ES module import
// of prod.js plus its stylesheet. The empty icon avoids a favicon 404.
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PORIS bundle smoke test</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { createPorisViewerPanel } from '/prod.js'
      window.createPorisViewerPanel = createPorisViewerPanel
    </script>
  </body>
</html>
`

const TYPES = { '.js': 'text/javascript', '.css': 'text/css' }

function build(outDir) {
  const args = ['run', 'build', '--', '--mode', 'csys-plugin', '--outDir', outDir, '--emptyOutDir']
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Bundle build failed (exit ${code}):\n${output}`))
    })
  })
}

async function checkBundle(outDir) {
  const failures = []
  const prodPath = join(outDir, 'prod.js')
  const prodSize = await stat(prodPath).then(
    (s) => s.size,
    () => 0
  )
  if (prodSize <= 100000) failures.push(`prod.js is ${prodSize} bytes (expected > 100000)`)
  if (!(await stat(join(outDir, 'style.css')).catch(() => null))) {
    failures.push('style.css is missing')
  }
  if (prodSize && /process\.env(\.NODE_ENV)?/.test(await readFile(prodPath, 'utf8'))) {
    failures.push('prod.js references process.env')
  }
  return { prodSize, failures }
}

function serve(outDir) {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(PAGE)
      return
    }
    const file = { '/prod.js': 'prod.js', '/style.css': 'style.css' }[pathname]
    try {
      if (!file) throw new Error('not found')
      const body = await readFile(join(outDir, file))
      res.writeHead(200, { 'Content-Type': TYPES[file.slice(file.lastIndexOf('.'))] })
      res.end(body)
    } catch {
      res.writeHead(404)
      res.end()
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// Mounts one model in a fresh page and returns what was rendered or why not.
async function checkModel(browser, baseUrl, name) {
  const { call, evaluate, waitFor, exceptions, consoleErrors } = browser
  const xml = await readFile(join(modelsDir, name), 'utf8')
  exceptions.length = 0
  consoleErrors.length = 0

  await call('Page.navigate', { url: `${baseUrl}/` })
  if (!(await waitFor(`typeof window.createPorisViewerPanel === 'function'`))) {
    return { problems: ['prod.js did not load or does not export createPorisViewerPanel'] }
  }

  // The XML goes inline through `modelXml`, as the plugin passes it, so the
  // test does not need to serve the models nor go through axios.
  await evaluate(`(() => {
    createPorisViewerPanel(${JSON.stringify(`/models/${name}`)}, '#app', {
      modelXml: ${JSON.stringify(xml)}
    })
  })()`)

  // The root panel heading is "<root subsystem name> Panel" and only exists
  // once the model has been parsed. Below it the tree is drawn with
  // SubSystemPanel boxes, or, when the root is a single PORIS parameter
  // (a.xml, ExpTime.xml), directly as one InputSystemPanel row.
  const rendered = await waitFor(
    `(() => {
    const title = document.querySelector('#app .poris-main > .panel > h2.title')
    if (!title) return null
    return {
      title: title.textContent.trim(),
      panels: document.querySelectorAll('#app .subsystem-panel, #app .inputsystem-panel').length,
      controls: document.querySelectorAll('#app select, #app input').length
    }
  })()`,
    { abort: () => exceptions.length > 0 }
  )
  // Give late asynchronous errors (watchers, timers) a chance to surface.
  await pause(250)

  const problems = []
  if (!rendered) problems.push('root panel title never rendered')
  else if (!/\S Panel$/.test(rendered.title)) problems.push(`unexpected title "${rendered.title}"`)
  else if (!rendered.panels) problems.push('no subsystem or input panel rendered')
  problems.push(...exceptions.map((e) => `uncaught: ${e}`))
  problems.push(...consoleErrors.map((e) => `console: ${e}`))
  return { rendered, problems }
}

const started = Date.now()
const workDir = await mkdtemp(join(tmpdir(), 'poris-smoke-'))
const outDir = join(workDir, 'bundle')
let server, browser
let failed = false
try {
  await build(outDir)
  const bundle = await checkBundle(outDir)
  for (const failure of bundle.failures) console.log(`FAIL  bundle: ${failure}`)
  if (bundle.failures.length) failed = true
  else console.log(`PASS  bundle: prod.js ${bundle.prodSize} bytes, style.css, no process.env`)

  server = await serve(outDir)
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  browser = await launchChrome()

  const models = (await readdir(modelsDir)).filter((f) => f.endsWith('.xml')).sort()
  let passed = 0
  for (const name of models) {
    if (EXCLUDED.has(name)) {
      console.log(`SKIP  ${name}: ${EXCLUDED.get(name)}`)
      continue
    }
    const t0 = Date.now()
    const { rendered, problems } = await checkModel(browser, baseUrl, name)
    const ms = Date.now() - t0
    if (problems.length) {
      failed = true
      console.log(`FAIL  ${name} (${ms} ms)`)
      for (const problem of problems) console.log(`      ${problem.replace(/\n/g, '\n      ')}`)
    } else {
      passed++
      console.log(
        `PASS  ${name}: "${rendered.title}", ${rendered.panels} panels, ` +
          `${rendered.controls} controls (${ms} ms)`
      )
    }
  }
  const skipped = models.filter((name) => EXCLUDED.has(name)).length
  console.log(
    `\n${passed}/${models.length - skipped} models passed` +
      (skipped ? `, ${skipped} skipped` : '') +
      ` in ${((Date.now() - started) / 1000).toFixed(1)} s`
  )
  // An empty or fully excluded model list must not pass as a green run.
  if (models.length - skipped === 0) {
    failed = true
    console.log(`FAIL  no model was mounted (looked in ${modelsDir})`)
  }
} catch (error) {
  failed = true
  console.error(error)
} finally {
  await browser?.close()
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()))
  await rm(workDir, { recursive: true, force: true })
}
process.exitCode = failed ? 1 : 0
