// Run Vite on localhost:5189, then: node tests/numeric-range-browser.mjs
/* eslint-env node */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const profile = await mkdtemp(join(tmpdir(), 'poris-slider-'))
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--window-size=1280,720', 'about:blank'
], { stdio: 'ignore' })
let socket
try {
  let port
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { /* Chrome is still starting. */ }
    if (!port) await pause(100)
  }
  assert(port, 'Chrome did not start')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let seq = 0
  const pending = new Map(), errors = []
  socket.onmessage = ({ data }) => {
    const m = JSON.parse(data)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
    const request = pending.get(m.id)
    if (request) {
      pending.delete(m.id)
      m.error ? request.reject(new Error(m.error.message)) : request.resolve(m.result)
    }
  }
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 10000)
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result) },
      reject: error => { clearTimeout(timer); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }
  await call('Runtime.enable')
  await call('Page.enable')
  await call('Emulation.setFocusEmulationEnabled', { enabled: true })
  await call('Page.navigate', { url: `${process.env.VIEWER_TEST_URL || 'http://127.0.0.1:5189'}/tests/numeric-range.html` })
  for (let i = 0; i < 100 && !await evaluate(`!!document.querySelector('.numberPicker')`); i++) await pause(100)
  assert(await evaluate(`!!document.querySelector('.numberPicker')`), 'Numeric field missing')
  for (let i = 0; i < 100 && !await evaluate(`document.readyState === 'complete'`); i++) await pause(50)
  assert(!await evaluate(`!!document.querySelector('input[type=range]')`), 'Slider visible before focus')
  await evaluate(`document.querySelector('.numberPicker').focus()`)
  await pause(100)
  assert(await evaluate(`!!document.querySelector('body > .poris-numeric-slider input[type=range]')`),
    'Floating slider missing: ' + await evaluate(`(() => {const c=document.querySelector('.numberPicker').__vueParentComponent; return JSON.stringify({props:c.props, range:c.setupState.hasRange, open:c.setupState.open, keys:Object.keys(c.setupState)})})()`) + JSON.stringify(errors))
  assert(await evaluate(`getComputedStyle(document.querySelector('.poris-numeric-slider')).position === 'fixed'`))
  await evaluate(`(() => { const r=document.querySelector('input[type=range]'); r.focus(); r.value='42.25'; r.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await pause(50)
  assert.equal(await evaluate(`document.querySelector('.numberPicker').value`), '42.25')
  assert.equal(await evaluate(`document.querySelector('#value').textContent`), '42.25')
  assert(await evaluate(`!!document.querySelector('input[type=range]')`), 'Slider lost during focus transfer')
  await evaluate(`document.querySelector('input[type=range]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`)
  await pause(50)
  assert(!await evaluate(`!!document.querySelector('input[type=range]')`), 'Escape did not close')
  assert(await evaluate(`document.activeElement === document.querySelector('.numberPicker')`))
  await evaluate(`document.querySelector('#outside').focus(); document.querySelector('.numberPicker').focus()`)
  await pause(50)
  await evaluate(`(() => { const n=document.querySelector('.numberPicker'); n.value='12.34'; n.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await pause(50)
  assert.equal(await evaluate(`document.querySelector('input[type=range]').value`), '12.34')
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await pause(50)
  assert.equal(await evaluate(`document.querySelector('.numberPicker').value`), '12.35', 'Fine keyboard step changed')
  await evaluate(`(() => {const r=document.querySelector('input[type=range]');r.value='1000';r.dispatchEvent(new Event('input',{bubbles:true}));})()`)
  await pause(50)
  assert.equal(await evaluate(`document.querySelector('#value').textContent`), '77.5', 'Slider exceeded range')
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  assert.equal(await evaluate(`document.querySelector('.numberPicker').value`), '77.5', 'Fine step exceeded max')
  await evaluate(`document.querySelector('#outside').focus()`)
  await pause(50)
  assert(!await evaluate(`!!document.querySelector('input[type=range]')`), 'Focus exit did not close')
  await evaluate(`(() => {const s=document.querySelector('select');s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await pause(50)
  await evaluate(`document.querySelector('.numberPicker').focus()`)
  await pause(50)
  assert.equal(await evaluate(`document.querySelector('input[type=range]').max`), '1', 'Selected value limits not updated')
  await evaluate(`document.querySelector('#outside').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`)
  await pause(50)
  assert(!await evaluate(`!!document.querySelector('input[type=range]')`), 'Outside pointer did not close')
  assert.deepEqual(errors, [])
  console.log('PASS: number/slider synchronization, floating outside scroll panel, limits, fine keyboard step, selected value switch, focus transfer, Escape and outside focus/pointer')
} finally {
  socket?.close()
  chrome.kill('SIGTERM')
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve))
  await rm(profile, { recursive: true, force: true })
}
