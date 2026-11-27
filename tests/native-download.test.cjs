const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const vm = require("node:vm")
const ts = require("typescript")

const root = path.join(__dirname, "..")
const compile = (file) =>
  ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
      esModuleInterop: true
    }
  }).outputText
const settingsModule = { exports: {} }
vm.runInNewContext(compile("options/types.ts"), {
  exports: settingsModule.exports
})
const background = compile("background/index.ts")
const flush = () => new Promise(setImmediate)
const item = {
  id: 1,
  url: "https://example.com/file.zip",
  filename: "file.zip",
  fileSize: 1024
}

function event() {
  const listeners = new Set()
  return {
    listeners,
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    emit: (...args) => [...listeners].map((listener) => listener(...args))[0]
  }
}

function setup({
  firefox = false,
  response = { code: 0 },
  notify = false,
  running = true
} = {}) {
  const settings = structuredClone(settingsModule.exports.defaultSettings)
  settings.confirmBeforeDownload = false
  settings.notifyOnNativeSuccess = notify
  const calls = []
  const suggestions = []
  const messages = []
  const timers = new Map()
  const intervals = []
  const port = {
    onMessage: event(),
    onDisconnect: event(),
    disconnect: () => calls.push(["disconnect"]),
    postMessage(message) {
      messages.push(message)
      if (response === "throw") throw new Error("Post failed")
      if (response === "pending") return
      queueMicrotask(() => {
        if (response === "disconnect") port.onDisconnect.emit()
        else
          port.onMessage.emit(
            message.method === "ping" ? { code: 0, data: running } : response
          )
      })
    }
  }
  const record =
    (name) =>
    async (...args) => {
      calls.push(name === "erase" ? [name, args[0].id] : [name, ...args])
      return 2
    }
  const chrome = {
    runtime: {
      id: "test-extension",
      connectNative: () => port,
      onStartup: event(),
      getURL: (url) => url
    },
    downloads: {
      onDeterminingFilename: firefox ? undefined : event(),
      onCreated: event(),
      pause: record("pause"),
      resume: record("resume"),
      cancel: record("cancel"),
      erase: record("erase"),
      download: record("download")
    },
    webRequest: { onBeforeSendHeaders: event(), onHeadersReceived: event() },
    contextMenus: { create() {}, onClicked: event() },
    notifications: { create: record("notify"), clear() {} }
  }
  let storageReads = 0
  const modules = {
    "@gopeed/rest": class {
      async createTask() {
        calls.push(["remote-create"])
        if (response.code !== 0) throw new Error("Remote create failed")
      }
    },
    "content-disposition": require("content-disposition"),
    "@plasmohq/storage": {
      Storage: class {
        get() {
          return ++storageReads === 1
            ? new Promise(() => {})
            : Promise.resolve(settings)
        }
        watch() {}
      }
    },
    "~background/messages/api/select-server": {},
    "~background/messages/api/skip": { skip: false },
    "~constants": { STORAGE_SETTINGS: "settings" },
    "~i18n": { getMessage: (_, key) => key },
    "~options/components/RemoteSettings": {
      getFullUrl: (server) => server.url
    },
    "~options/types": { defaultSettings: settings },
    "~util/settings": { getMergedSettings: (value) => value }
  }
  const context = {
    chrome,
    exports: {},
    btoa,
    process: { env: { PLASMO_BROWSER: firefox ? "firefox" : "chrome" } },
    console: { log() {}, warn() {}, error() {} },
    require: (name) => (name === "path" ? require(name) : modules[name]),
    setInterval: (callback) => intervals.push(callback),
    setTimeout: (callback, delay) => {
      const id = {}
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout: (id) => timers.delete(id)
  }
  vm.runInNewContext(
    background +
      `
    globalThis.api = { connectNativeAndPost, initContextMenus };
  `,
    context
  )
  return {
    settings,
    calls,
    suggestions,
    messages,
    timers,
    port,
    chrome,
    api: context.api,
    tick: () => intervals[0](),
    download: (downloadItem = item) =>
      new Promise((resolve) => {
        const result = (
          chrome.downloads.onDeterminingFilename || chrome.downloads.onCreated
        ).emit(
          downloadItem,
          firefox
            ? undefined
            : () => {
                suggestions.push(downloadItem.id)
                resolve()
              }
        )
        if (!firefox)
          assert.equal(
            result,
            true,
            "filename listener must return true synchronously"
          )
        if (firefox) flush().then(resolve)
      }),
    headers: () =>
      chrome.webRequest.onHeadersReceived.emit({
        url: item.url,
        statusCode: 200,
        type: "main_frame",
        tabId: 1,
        responseHeaders: [
          {
            name: "content-disposition",
            value: 'attachment; filename="file.zip"'
          }
        ]
      })
  }
}

test("local failure resumes the original browser download and obeys the notification switch", async () => {
  for (const notify of [false, true]) {
    const h = setup({ response: { code: 1, message: "Create failed" }, notify })
    await h.download()
    assert.deepEqual(
      h.calls.map(([name]) => name),
      notify ? ["notify"] : []
    )
    assert.deepEqual(h.suggestions, [1])
    assert.equal(
      h.messages.filter(({ method }) => method === "create").length,
      1
    )
  }
})

test("filename selection is held until acknowledgement, then the cancelled placeholder is erased", async () => {
  for (const notify of [false, true]) {
    const h = setup({ response: "pending", notify })
    const download = h.download()
    await flush()
    assert.deepEqual(h.calls, [])
    assert.deepEqual(h.suggestions, [])
    h.port.onMessage.emit({ code: 0 })
    await download
    await flush()
    assert.deepEqual(
      h.calls.map(([name]) => name),
      notify ? ["notify", "cancel", "erase"] : ["cancel", "erase"]
    )
    assert.deepEqual(h.suggestions, [1])
    assert.deepEqual(
      h.messages.map(({ method }) => method),
      ["create"]
    )
  }
})

test("confirmation mode still falls back on failure without a browser notification", async () => {
  const h = setup({ response: { code: 1 }, notify: true })
  h.settings.confirmBeforeDownload = true
  await h.download()
  assert.deepEqual(h.calls, [])
  assert.deepEqual(h.suggestions, [1])
  assert.equal(
    h.messages.find(({ method }) => method === "create").meta.silent,
    false
  )
})

test("Unicode URLs survive the native host's base64 JSON decoder", async () => {
  const h = setup()
  await h.download({ ...item, url: "https://example.com/下载.zip" })
  const create = h.messages.find(({ method }) => method === "create")
  assert.equal(
    JSON.parse(atob(create.params)).req.url,
    "https://example.com/下载.zip"
  )
})

test("disconnects and synchronous post failures resume without notifications or leaked listeners", async () => {
  for (const response of ["disconnect", "throw"]) {
    const h = setup({ response })
    await h.download()
    assert.deepEqual(h.calls, [])
    assert.deepEqual(h.suggestions, [1])
    assert.equal(h.port.onMessage.listeners.size, 0)
    assert.equal(h.port.onDisconnect.listeners.size, 1)
    assert.equal(h.timers.size, 0)
  }
})

test("an unresponsive host times out and returns the download to the browser", async () => {
  const h = setup({ response: "pending" })
  const download = h.download()
  await flush()
  const timeout = [...h.timers.values()].find(({ delay }) => delay === 30000)
  assert.ok(timeout)
  timeout.callback()
  await download
  await flush()
  assert.deepEqual(h.calls, [["disconnect"]])
  assert.deepEqual(h.suggestions, [1])
  assert.equal(h.port.onMessage.listeners.size, 0)
})

test("Chrome releases filename selection after 10 seconds and ignores late acknowledgements", async () => {
  for (const code of [0, 1]) {
    const h = setup({ response: "pending" })
    const download = h.download()
    const timeout = [...h.timers.values()].find(({ delay }) => delay === 10000)
    assert.ok(timeout, "the deadline starts synchronously with the filename event")
    await flush()
    assert.deepEqual(h.suggestions, [])
    assert.deepEqual(h.messages.map(({ method }) => method), ["create"])

    timeout.callback()
    await download
    assert.deepEqual(h.suggestions, [1])
    assert.deepEqual(h.calls, [])

    h.port.onMessage.emit({ code })
    await flush()
    assert.deepEqual(h.calls, [])
    assert.deepEqual(h.suggestions, [1])
    assert.equal(h.timers.size, 0)
  }
})

test("Chrome's 10-second deadline includes native host queue time", async () => {
  for (const queuedAtTimeout of [false, true]) {
    const h = setup({ response: "pending" })
    const ping = h.api.connectNativeAndPost({ method: "ping" })
    const download = h.download()
    const timeout = [...h.timers.values()].find(({ delay }) => delay === 10000)
    assert.ok(timeout)
    await flush()
    assert.deepEqual(h.messages.map(({ method }) => method), ["ping"])

    const finishPing = async () => {
      h.port.onMessage.emit({ code: 0, data: true })
      await ping
      await flush()
      assert.deepEqual(h.messages.map(({ method }) => method), ["ping", "create"])
    }
    if (!queuedAtTimeout) await finishPing()
    assert.ok([...h.timers.values()].includes(timeout), "queueing must not reset the deadline")
    timeout.callback()
    await download
    assert.deepEqual(h.suggestions, [1])
    assert.deepEqual(h.calls, [])

    if (queuedAtTimeout) await finishPing()
    h.port.onMessage.emit({ code: 0 })
    await flush()
    assert.deepEqual(h.calls, [])
    assert.deepEqual(h.suggestions, [1])
    assert.equal(h.timers.size, 0)
  }
})

test("ping and create requests cannot consume each other's responses", async () => {
  const h = setup({ response: "pending" })
  const ping = h.api.connectNativeAndPost({ method: "ping" })
  const create = h.api.connectNativeAndPost({ method: "create" })
  await flush()
  assert.deepEqual(
    h.messages.map(({ method }) => method),
    ["ping"]
  )
  h.port.onMessage.emit({ code: 0, data: true })
  assert.equal((await ping).data, true)
  await flush()
  assert.deepEqual(
    h.messages.map(({ method }) => method),
    ["ping", "create"]
  )
  h.port.onMessage.emit({ code: 1 })
  assert.equal((await create).code, 1)
})

test("Firefox lets the original request continue after failure without recapturing it", async () => {
  const h = setup({ firefox: true, response: { code: 1 } })
  assert.equal((await h.headers()).cancel, false)
  await h.download()
  assert.deepEqual(h.calls, [])
  assert.equal(h.messages.filter(({ method }) => method === "create").length, 1)
})

test("Firefox hands off at the response before any save dialog or browser download", async () => {
  const h = setup({ firefox: true })
  assert.equal((await h.headers()).cancel, true)
  await h.download()
  assert.deepEqual(h.calls, [])
  assert.deepEqual(h.calls, [])
})

test("successful handoff does not monitor task status or trigger a later browser fallback", async () => {
  const h = setup()
  await h.download()
  await h.tick()
  await h.tick()
  assert.deepEqual(
    h.messages.map(({ method }) => method),
    ["create", "ping", "ping"]
  )
  assert.deepEqual(h.calls, [
    ["cancel", 1],
    ["erase", 1]
  ])
})

test("context menu failure starts a browser download that bypasses capture", async () => {
  for (const unavailable of [false, true]) {
    const h = setup({ response: { code: 1 }, running: !unavailable })
    h.settings.autoWakeup = !unavailable
    h.api.initContextMenus()
    await h.chrome.contextMenus.onClicked.emit({ linkUrl: item.url })
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0][0], "download")
    assert.equal(h.calls[0][1].url, item.url)
    const messageCount = h.messages.length
    await h.download({ ...item, byExtensionId: h.chrome.runtime.id })
    assert.equal(h.messages.length, messageCount)
    assert.equal(h.calls.length, 1)
  }
})

test("remote downloads retain their existing cancellation and notification behavior", async () => {
  for (const code of [0, 1]) {
    const h = setup({ response: { code } })
    Object.assign(h.settings.remote, {
      enabled: true,
      selectedServer: "https://server.example",
      servers: [{ url: "https://server.example" }]
    })
    await h.download()
    await flush()
    assert.deepEqual(
      h.calls.map(([name]) => name),
      code === 0
        ? ["cancel", "erase", "remote-create"]
        : ["cancel", "erase", "remote-create", "notify"]
    )
    assert.equal(h.messages.length, 0)
  }
})

test(
  "installed Gopeed keeps accepted downloads after both failure and completion",
  {
    skip: !process.env.GOPEED_NATIVE_HOST,
    timeout: 60000
  },
  async () => {
    const { spawn } = require("node:child_process")
    const http = require("node:http")
    const os = require("node:os")
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "gopeed-fallback-test-")
    )
    const server = http.createServer((req, res) => {
      if (req.url === "/failure") {
        res.writeHead(403)
        res.end()
      } else {
        res.writeHead(200, {
          "Content-Length": "4",
          "Content-Disposition": 'attachment; filename="fallback-test.txt"'
        })
        res.end("test")
      }
    })
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
    const child = spawn(process.env.GOPEED_NATIVE_HOST, [], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    })
    let buffer = Buffer.alloc(0)
    let receive
    child.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length < 4 || buffer.length < buffer.readUInt32LE(0) + 4)
        return
      const size = buffer.readUInt32LE(0)
      const response = JSON.parse(buffer.subarray(4, size + 4).toString())
      buffer = buffer.subarray(size + 4)
      receive(response)
    })
    const post = (message) =>
      new Promise((resolve) => {
        receive = resolve
        const data = Buffer.from(JSON.stringify(message))
        const size = Buffer.alloc(4)
        size.writeUInt32LE(data.length)
        child.stdin.write(Buffer.concat([size, data]))
      })
    const taskIds = []
    try {
      for (const scenario of ["failure", "success"]) {
        const h = setup()
        h.port.postMessage = (message) => {
          h.messages.push(message)
          if (message.method === "create") {
            const data = JSON.parse(atob(message.params))
            data.opts = { path: directory, name: `${scenario}.txt` }
            message = { ...message, params: btoa(JSON.stringify(data)) }
          }
          post(message).then((response) => h.port.onMessage.emit(response))
        }
        await h.download({
          ...item,
          url: `http://127.0.0.1:${server.address().port}/${scenario}`
        })
        assert.deepEqual(h.calls, [
          ["cancel", 1],
          ["erase", 1]
        ])
        const url = JSON.parse(
          atob(h.messages.find(({ method }) => method === "create").params)
        ).req.url
        let status
        for (let i = 0; i < 100; i++) {
          const result = await post({
            method: "forward",
            params: { method: "GET", path: "/api/v1/tasks" }
          })
          const task = result.data.data.find(
            (task) => task.meta?.req?.url === url
          )
          if (task && !taskIds.includes(task.id)) taskIds.push(task.id)
          status = task?.status
          if (status === "error" || status === "done") break
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
        assert.equal(status, scenario === "failure" ? "error" : "done")
        await h.tick()
        assert.deepEqual(
          h.calls.map(([name]) => name),
          ["cancel", "erase"]
        )
      }
    } finally {
      for (const id of taskIds) {
        await post({
          method: "forward",
          params: {
            method: "DELETE",
            path: `/api/v1/tasks/${encodeURIComponent(id)}?force=true`
          }
        })
      }
      child.stdin.end()
      child.kill()
      server.close()
      assert.equal(
        path.dirname(path.resolve(directory)),
        path.resolve(os.tmpdir())
      )
      assert.ok(path.basename(directory).startsWith("gopeed-fallback-test-"))
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }
)
