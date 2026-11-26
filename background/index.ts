import path from "path"
import Client from "@gopeed/rest"
import { type Request } from "@gopeed/types"
import contentDisposition from "content-disposition"

import { Storage } from "@plasmohq/storage"

import { requestServerSelection } from "~background/messages/api/select-server"
import { skip as pressToSkip } from "~background/messages/api/skip"
import { STORAGE_SETTINGS } from "~constants"
import { getMessage } from "~i18n"
import { getFullUrl } from "~options/components/RemoteSettings"
import { defaultSettings, type Settings } from "~options/types"
import { getMergedSettings } from "~util/settings"

export {}

// Native notification utility function
async function showNativeNotification(
  type: "success" | "error" | "warning" | "info" = "success",
  title: string,
  message: string
) {
  const notificationId = `gopeed-${Date.now()}`

  try {
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: title,
      message: message,
      priority: type === "error" ? 2 : 1
    })

    // Auto-clear notification after 6 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId)
    }, 6000)
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}

function initContextMenus() {
  // Create a single context menu for all supported contexts
  chrome.contextMenus.create({
    id: "gopeed-download",
    title: t("context_menu_download"),
    contexts: ["link", "image", "video", "audio"]
  })

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Determine URL: linkUrl for links, srcUrl for images/videos/audio
    const url = info.srcUrl || info.linkUrl

    if (!url) {
      console.error("No URL found for context menu download")
      return
    }

    // Extract filename from URL
    let filename: string
    try {
      const urlObj = new URL(url)
      filename = path.basename(urlObj.pathname) || "unknown"
    } catch (e) {
      filename = "unknown"
    }

    // Get current settings
    const settings = await refreshSettings()
    const isRunning = await refreshIsRunning()

    // Create download info object
    const downloadInfo: DownloadInfo = {
      url: url,
      filename: filename,
      filesize: 0 // Unknown file size for context menu downloads
    }

    // Get download handler and execute
    const handler = downloadHandler(downloadInfo, settings, isRunning)
    if (!handler) {
      if (!settings.remote.enabled) {
        await chrome.downloads.download({ url })
        return
      }
      await showNativeNotification(
        "error",
        t("notification_download_failed"),
        t("notification_no_handler")
      )
      return
    }

    // Execute the download
    const success = await handler()
    if (!settings.remote.enabled && !success) {
      await chrome.downloads.download({ url })
    }
  })
}

let connectNativePort: chrome.runtime.Port | null = null
let nativeRequestQueue: Promise<unknown> = Promise.resolve()

function connectNative(): boolean {
  if (connectNativePort) {
    return true
  }
  try {
    connectNativePort = chrome.runtime.connectNative("com.gopeed.gopeed")
    connectNativePort.onDisconnect.addListener(() => {
      connectNativePort = null
    })
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

function connectNativeAndPost<T>(
  message: HostRequest<any>
): Promise<HostResponse<T>> {
  // The native protocol has no request IDs, so only one request can be in flight.
  const request = nativeRequestQueue.then(() => {
    if (!connectNative()) {
      throw new Error("Native host unavailable")
    }
    const port = connectNativePort
    return new Promise<HostResponse<T>>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        port.onMessage.removeListener(onMessage)
        port.onDisconnect.removeListener(onDisconnect)
      }
      const onMessage = (response: HostResponse<T>) => {
        cleanup()
        resolve(response)
      }
      const onDisconnect = () => {
        cleanup()
        reject(
          new Error(
            chrome.runtime.lastError?.message || "Native host disconnected"
          )
        )
      }
      const timer = setTimeout(() => {
        cleanup()
        connectNativePort = null
        port.disconnect()
        reject(new Error("Native host response timed out"))
      }, 30000)
      port.onMessage.addListener(onMessage)
      port.onDisconnect.addListener(onDisconnect)
      try {
        port.postMessage(message)
      } catch (e) {
        cleanup()
        reject(e)
      }
    })
  })
  nativeRequestQueue = request.catch(() => {})
  return request
}

connectNative()

const isFirefox = process.env.PLASMO_BROWSER === "firefox"
const storage = new Storage()

let settingsCache = defaultSettings
let isRunningCache = false
const t = (key: string, substitutions?: string | string[]) =>
  getMessage(settingsCache.language, key, substitutions)

async function refreshSettings(): Promise<Settings> {
  const storedSettings = await storage.get<Settings>(STORAGE_SETTINGS)
  const settings = getMergedSettings(storedSettings)
  settingsCache = settings
  return settings
}

storage.watch({
  [STORAGE_SETTINGS]: (settingsChange) => {
    if (!settingsChange?.newValue) {
      return
    }

    const previousLanguage = settingsCache.language
    settingsCache = getMergedSettings(settingsChange.newValue)

    if (previousLanguage !== settingsCache.language) {
      chrome.contextMenus.update(
        "gopeed-download",
        { title: t("context_menu_download") },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Failed to update context menu:",
              chrome.runtime.lastError.message
            )
          }
        }
      )
    }
  }
})

async function refreshIsRunning(): Promise<boolean> {
  try {
    const resp = await connectNativeAndPost({
      method: "ping"
    })
    isRunningCache = (resp?.data || false) === true
  } catch (e) {
    console.warn(e)
    isRunningCache = false
  }
  return isRunningCache
}

// Try to avoid the issue of the extension inactive after the browser is restarted.
// https://stackoverflow.com/a/76344225/8129004
chrome.runtime.onStartup &&
  chrome.runtime.onStartup.addListener(function () {
    console.log("onStartup")
  })
;(async function () {
  setInterval(async () => {
    await refreshSettings()
    await refreshIsRunning()
  }, 3000)
  await refreshSettings()
  await refreshIsRunning()

  // Initialize context menus
  initContextMenus()

  // Cleanup old entries from downloadEventSkipMap every 30 seconds
  // to prevent memory leaks in case onCreated never fires
  setInterval(() => {
    // Note: Since we're using URL as key and deleting immediately after use,
    // this is just a safety net. In practice, entries should be deleted quickly.
    if (downloadEventSkipMap.size > 100) {
      // If map grows too large, clear it entirely as a safety measure
      downloadEventSkipMap.clear()
    }
    if (requestHeaderMap.size > 100) {
      requestHeaderMap.clear()
    }
  }, 30000)
})()

interface DownloadInfo {
  url: string
  filename: string
  filesize: number
  tabId?: number
}

const requestHeaderMap = new Map<string, Record<string, string>>()

function storeRequestHeaders(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  if (!details.requestHeaders || details.requestHeaders.length === 0) {
    return
  }

  const requestHeaders = details.requestHeaders.reduce<Record<string, string>>(
    (acc, header) => {
      if (header.name && header.value) {
        acc[header.name] = header.value
      }
      return acc
    },
    {}
  )

  if (Object.keys(requestHeaders).length > 0) {
    requestHeaderMap.set(details.url, requestHeaders)
  }
}

function consumeRequestHeaders(url: string): Record<string, string> {
  const headers = requestHeaderMap.get(url) || {}
  if (requestHeaderMap.has(url)) {
    requestHeaderMap.delete(url)
  }
  return headers
}

function downloadFilter(info: DownloadInfo, settings: Settings): boolean {
  if (info.url.startsWith("blob:") || info.url.startsWith("data:")) {
    return false
  }

  if (settings.ctrlDisableCapture && pressToSkip) {
    return false
  }
  if (settings.enabled === false) {
    return false
  }
  if (settings.excludeDomains.enabled) {
    const excludes = settings.excludeDomains.list
      .split("\n")
      .map((ex) => ex.trim())
      .filter((ex) => ex.length > 0)
    const host = new URL(info.url).host
    for (const exclude of excludes) {
      if (isDomainMatch(host, exclude)) {
        return false
      }
    }
  }
  if (settings.excludeFileTypes.enabled && info.filename) {
    const excludes = settings.excludeFileTypes.list
      .split("\n")
      .map((ext) => ext.trim().toLowerCase())
    const ext = path.extname(info.filename).toLowerCase()
    if (excludes.includes(ext)) {
      return false
    }
  }

  if (
    settings.minFileSize.enabled &&
    settings.minFileSize.value > 0 &&
    info.filesize > 0
  ) {
    if (info.filesize < settings.minFileSize.value * 1024 * 1024) {
      return false
    }
  }

  return true
}

function downloadHandler(
  info: DownloadInfo,
  settings: Settings,
  isRunning: boolean = isRunningCache
): Function {
  let handler: Function | undefined
  if (settings.remote.enabled === true) {
    handler = handleRemoteDownload(info, settings)
  } else {
    handler = handleNativeDownload(info, settings, isRunning)
  }
  return handler
}

// In Firefox, the download interception logic will be triggered twice, the order is onHeadersReceived -> onCreated, so a variable is needed to skip the onCreated event to avoid duplicate processing of download tasks.
// PS: Why not use the onCreated event uniformly? Because the onCreated event cannot get the size of the downloaded file in Firefox.
// Use a Map to track skip status per-download to avoid race conditions with multiple tabs
const downloadEventSkipMap = new Map<string, boolean>()

chrome.webRequest.onBeforeSendHeaders.addListener(
  storeRequestHeaders,
  { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
  isFirefox ? ["requestHeaders"] : ["requestHeaders", "extraHeaders"]
)

async function handleBrowserDownload(
  item: chrome.downloads.DownloadItem,
  suggest?: () => void
) {
  let paused = false
  let cancelled = false
  try {
    if (item.byExtensionId === chrome.runtime.id) {
      return
    }
    const info: DownloadInfo = {
      url: item.finalUrl || item.url,
      filename: item.filename,
      filesize: item.fileSize
    }
    const downloadUrl = item.finalUrl || item.url
    if (isFirefox && downloadEventSkipMap.get(downloadUrl)) {
      downloadEventSkipMap.delete(downloadUrl)
      return
    }

    const settings = settingsCache
    if (!downloadFilter(info, settings)) {
      return
    }

    const handler = downloadHandler(info, settings, isRunningCache)
    if (!handler) {
      return
    }

    if (!suggest) {
      await chrome.downloads.pause(item.id)
      paused = true
    }

    if (!settings.remote.enabled && !(await handler())) {
      return
    }

    await chrome.downloads.cancel(item.id)
    cancelled = true
    await chrome.downloads.erase({ id: item.id })

    if (settings.remote.enabled) {
      await handler()
    }
  } finally {
    try {
      if (paused && !cancelled) await chrome.downloads.resume(item.id)
    } finally {
      suggest?.()
    }
  }
}

if (chrome.downloads.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Hold filename selection until handoff, before the browser opens its download UI.
    void handleBrowserDownload(item, suggest).catch(console.error)
    return true
  })
} else {
  chrome.downloads.onCreated.addListener((item) => {
    void handleBrowserDownload(item).catch(console.error)
  })
}

function checkContentDisposition(
  res: chrome.webRequest.WebResponseHeadersDetails
): string {
  return res.responseHeaders.find(
    (header) =>
      header.name.toLowerCase() === "content-disposition" &&
      header.value.toLowerCase().startsWith("attachment")
  )?.value
}

if (isFirefox) {
  chrome.webRequest.onHeadersReceived.addListener(
    function (res) {
      if (res.statusCode !== 200 || res.type == "xmlhttprequest") {
        return
      }

      const contentDispositionValue = checkContentDisposition(res)
      if (!contentDispositionValue) {
        return
      }

      let filename = ""
      // Parse filename from content-disposition
      if (contentDispositionValue) {
        const parse = contentDisposition.parse(contentDispositionValue)
        filename = parse.parameters.filename
      } else {
        filename = path.basename(res.url)
      }

      let filesize = 0
      const contentLength = res.responseHeaders.find(
        (header) => header.name.toLowerCase() === "content-length"
      )?.value
      if (contentLength) {
        filesize = parseInt(contentLength)
      }

      const info: DownloadInfo = {
        url: res.url,
        filename,
        filesize,
        tabId: res.tabId
      }
      downloadEventSkipMap.set(res.url, true)
      if (!downloadFilter(info, settingsCache)) {
        return
      }

      const settings = settingsCache
      const handler = downloadHandler(info, settings)
      if (!handler) {
        return
      }

      if (!settings.remote.enabled) {
        // Firefox can decide at the response, before creating a download or save dialog.
        return handler().then((success: boolean) => ({ cancel: success }))
      }

      handler()

      return { cancel: true }
    },
    { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
    ["blocking", "responseHeaders"]
  )
}

function handleRemoteDownload(
  info: DownloadInfo,
  settings: Settings
): Function | undefined {
  // If only one server, no servers, or manual selection is disabled, use existing logic
  if (
    settings.remote.servers.length <= 1 ||
    !settings.remote.requireManualSelection
  ) {
    const server = settings.remote.servers.find(
      (server) => getFullUrl(server) === settings.remote.selectedServer
    )
    if (!server) {
      return
    }
    return createDownloadTask(info, server, settings)
  }

  // Multiple servers available and manual selection is enabled - show server selector
  return async () => {
    try {
      // Use the tabId from the download info (for Firefox webRequest) or query for active tab
      let tabId = info.tabId
      if (tabId === undefined) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tabs.length === 0) {
          // Fallback to default server if no active tab
          const defaultServer = settings.remote.servers.find(
            (server) => getFullUrl(server) === settings.remote.selectedServer
          )
          if (defaultServer) {
            await createDownloadTask(info, defaultServer, settings)()
          }
          return
        }
        tabId = tabs[0].id!
      }

      const requestId = tabId.toString()

      // Send message to content script to show server selector
      await chrome.tabs.sendMessage(tabId, {
        name: "show-server-selector",
        body: {
          servers: settings.remote.servers,
          downloadInfo: {
            url: info.url,
            filename: info.filename
          },
          defaultServer: settings.remote.selectedServer,
          requestId: requestId
        }
      })

      // Wait for server selection
      const response = await requestServerSelection(requestId, {
        servers: settings.remote.servers,
        downloadInfo: {
          url: info.url,
          filename: info.filename
        }
      })

      if (response.cancelled || !response.selectedServer) {
        return
      }

      // Find selected server and create download task
      const selectedServer = settings.remote.servers.find(
        (server) => getFullUrl(server) === response.selectedServer
      )

      if (selectedServer) {
        // Execute download task and get result
        const downloadSuccess = await executeDownloadTask(
          info,
          selectedServer,
          settings
        )

        // Send result back to content script to handle popup closure
        await chrome.tabs.sendMessage(tabId, {
          name: "download-result",
          body: {
            success: downloadSuccess,
            requestId: requestId
          }
        })
      }
    } catch (error) {
      console.error("Server selection failed:", error)
      // Fallback to default server
      const defaultServer = settings.remote.servers.find(
        (server) => getFullUrl(server) === settings.remote.selectedServer
      )
      if (defaultServer) {
        await createDownloadTask(info, defaultServer, settings)()
      }
    }
  }
}

async function executeDownloadTask(
  info: DownloadInfo,
  server: Server,
  settings: Settings
): Promise<boolean> {
  const client = new Client({
    host: getFullUrl(server),
    token: server.token
  })
  let notificationType: string = "success"
  let notificationTitle: string
  let notificationMessage: string
  let success = false

  try {
    await client.createTask({
      req: await toCreateRequest(info)
    })
    notificationTitle = t("notification_create_success")
    notificationMessage = t("notification_create_success_message")
    success = true
  } catch (e) {
    console.error(e)
    notificationType = "error"
    notificationTitle = t("notification_create_error")
    notificationMessage = t("notification_create_error_message")
    success = false
  }

  // Show notification based on confirmBeforeDownload setting
  if (settings.confirmBeforeDownload || !success) {
    await showNativeNotification(
      notificationType as "success" | "error",
      notificationTitle,
      notificationMessage
    )
  }

  return success
}

function createDownloadTask(
  info: DownloadInfo,
  server: Server,
  settings: Settings
): Function {
  return async () => {
    const client = new Client({
      host: getFullUrl(server),
      token: server.token
    })
    let notificationType: string = "success"
    let notificationTitle: string
    let notificationMessage: string
    let success = false
    try {
      await client.createTask({
        req: await toCreateRequest(info)
      })
      notificationTitle = t("notification_create_success")
      notificationMessage = t("notification_create_success_message")
      success = true
    } catch (e) {
      console.error(e)
      notificationType = "error"
      notificationTitle = t("notification_create_error")
      notificationMessage = t("notification_create_error_message")
      success = false
    }

    // Show notification based on confirmBeforeDownload setting or if there's an error
    if (settings.confirmBeforeDownload || !success) {
      await showNativeNotification(
        notificationType as "success" | "error",
        notificationTitle,
        notificationMessage
      )
    }
    return success
  }
}

interface HostRequest<T> {
  method: string
  meta?: Record<string, any>
  params?: T
}

interface HostResponse<T> {
  code: number
  data?: T
  message?: string
}

function handleNativeDownload(
  info: DownloadInfo,
  settings: Settings,
  isRunning: boolean
): Function | undefined {
  if (!connectNativePort) {
    return
  }
  if (!settings.autoWakeup && !isRunning) {
    return
  }

  return async () => {
    try {
      const req = await toCreateRequest(info)
      const response = await connectNativeAndPost<string>({
        method: "create",
        meta: {
          silent: !settings.confirmBeforeDownload
        },
        params: btoa(
          JSON.stringify({ req }).replace(
            /[\u007f-\uffff]/g,
            (character) =>
              "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")
          )
        )
      })
      if (response?.code !== 0) {
        throw new Error(response?.message || "Native download failed")
      }

      if (!settings.confirmBeforeDownload && settings.notifyOnNativeSuccess) {
        await showNativeNotification(
          "success",
          t("notification_create_success"),
          t("notification_native_success_message")
        )
      }
      return true
    } catch (e) {
      console.error(e)
      if (!settings.confirmBeforeDownload && settings.notifyOnNativeSuccess) {
        await showNativeNotification(
          "error",
          t("notification_create_error"),
          t("notification_native_error_message")
        )
      }
      return false
    }
  }
}

async function toCreateRequest(info: DownloadInfo): Promise<Request> {
  const capturedHeaders = consumeRequestHeaders(info.url)
  // Force an identity response body to avoid encoded payloads that break multi-part downloading.
  return {
    url: info.url,
    extra: {
      header: {
        ...capturedHeaders,
        "Accept-Encoding": "identity"
      }
    }
  }
}

function isDomainMatch(host: string, pattern: string): boolean {
  const patternLen = pattern.length

  // Handle different pattern types based on leading/trailing characters
  if (patternLen > 2 && pattern[0] === "*" && pattern[patternLen - 1] === "*") {
    // Contains match: *example.com* matches any domain containing example.com
    const middlePattern = pattern.substring(1, patternLen - 1)
    return host.includes(middlePattern)
  }

  if (patternLen > 1 && pattern[0] === "*") {
    if (pattern[1] === ".") {
      // Subdomain match: *.example.com matches subdomains but not the domain itself
      const parentDomain = pattern.substring(2) // example.com
      return host !== parentDomain && host.endsWith("." + parentDomain)
    } else {
      // All match: *example.com matches domain and all subdomains
      const parentDomain = pattern.substring(1) // example.com
      return host === parentDomain || host.endsWith("." + parentDomain)
    }
  }

  if (patternLen > 1 && pattern[0] === "/" && pattern[patternLen - 1] === "/") {
    // Regex match: /pattern/ matches using regular expression
    try {
      const regexPattern = pattern.substring(1, patternLen - 1)
      const regex = new RegExp(regexPattern)
      return regex.test(host)
    } catch (e) {
      console.warn(`Invalid regex pattern: ${pattern}`)
      return false
    }
  }

  // Exact match: example.com only matches example.com
  return pattern === host
}
