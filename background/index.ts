import Client from "@gopeed/rest"
import { type Request } from "@gopeed/types"
import contentDisposition from "content-disposition"
import path from "path"

import { Storage } from "@plasmohq/storage"

import { requestServerSelection } from "~background/messages/api/select-server"
import { skip as pressToSkip } from "~background/messages/api/skip"
import { STORAGE_SETTINGS } from "~constants"
import { getFullUrl } from "~options/components/RemoteSettings"
import { defaultSettings, type Settings } from "~options/types"
import type { Server } from "~types"
import { getMergedSettings } from "~util/settings"

export { }

// Native notification utility function
async function showNativeNotification(type: "success" | "error" | "warning" | "info" = "success", title: string, message: string) {
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

/* function initContextMenus() {
  chrome.contextMenus.create({
    id: "sniff",
    title: "Download All Resource",
    contexts: ["page", "selection", "link", "action"]
  })

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log(info, tab)
    const filePath = sniffer.split("/").pop().split("?")[0]
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [filePath]
    })
  })
} */

let connectNativePort: chrome.runtime.Port | null = null

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

async function connectNativeAndPost<T>(
  message: HostRequest<any>
): Promise<HostResponse<T>> {
  if (connectNative()) {
    return new Promise((resolve, reject) => {
      const cb = (response: any) => {
        connectNativePort.onMessage.removeListener(cb)
        resolve(response)
      }
      try {
        connectNativePort.onMessage.addListener(cb)
        connectNativePort.postMessage(message)
      } catch (e) {
        reject(e)
      }
    })
  }
}

connectNative()

const isFirefox = process.env.PLASMO_BROWSER === "firefox"
const storage = new Storage()

let settingsCache = defaultSettings
let isRunningCache = false
async function refreshSettings(): Promise<Settings> {
  const storedSettings = await storage.get<Settings>(STORAGE_SETTINGS)
  const settings = getMergedSettings(storedSettings)
  settingsCache = settings
  return settings
}
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
})()

interface DownloadInfo {
  url: string
  filename: string
  filesize: number
  ua?: string
  referrer?: string
  cookieStoreId?: string
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
    const excludes = settings.excludeDomains.list.split("\n")
    const host = new URL(info.url).host
    if (excludes.includes(host)) {
      return false
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

// chrome.downloads.onDeterminingFilename only available in Chrome
const downloadEvent =
  chrome.downloads.onDeterminingFilename || chrome.downloads.onCreated
// In Firefox, the download interception logic will be triggered twice, the order is onHeadersReceived -> onCreated, so a variable is needed to skip the onCreated event to avoid duplicate processing of download tasks.
// PS: Why not use the onCreated event uniformly? Because the onCreated event cannot get the size of the downloaded file in Firefox.
let downloadEventSkip = false

downloadEvent.addListener(async function (item) {
  const info: DownloadInfo = {
    url: item.finalUrl || item.url,
    filename: item.filename,
    filesize: item.fileSize,
    ua: navigator.userAgent,
    referrer: item.referrer,
    cookieStoreId: (item as any).cookieStoreId
  }
  if (isFirefox && downloadEventSkip) {
    downloadEventSkip = false
    return
  }

  if (!downloadFilter(info, settingsCache)) {
    return
  }

  await chrome.downloads.pause(item.id)

  const handler = downloadHandler(info, settingsCache, isRunningCache)
  if (!handler) {
    await chrome.downloads.resume(item.id)
    return
  }

  await chrome.downloads.cancel(item.id)
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message)
  }
  if (isFirefox) {
    await chrome.downloads.erase({ id: item.id })
  }

  handler()
})

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

      // Skip the onCreated event to avoid duplicate processing of download tasks.
      downloadEventSkip = true

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
        ua: navigator.userAgent,
        referrer: (res as any).originUrl,
        cookieStoreId: (res as any).cookieStoreId
      }
      if (!downloadFilter(info, settingsCache)) {
        return
      }

      const handler = downloadHandler(info, settingsCache)
      if (!handler) {
        return
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
      // Show server selector overlay
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

      const tabId = tabs[0].id!
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
    notificationTitle = chrome.i18n.getMessage("notification_create_success")
    notificationMessage = chrome.i18n.getMessage(
      "notification_create_success_message"
    )
    success = true
  } catch (e) {
    console.error(e)
    notificationType = "error"
    notificationTitle = chrome.i18n.getMessage("notification_create_error")
    notificationMessage = chrome.i18n.getMessage(
      "notification_create_error_message"
    )
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
      notificationTitle = chrome.i18n.getMessage("notification_create_success")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_success_message"
      )
      success = true
    } catch (e) {
      console.error(e)
      notificationType = "error"
      notificationTitle = chrome.i18n.getMessage("notification_create_error")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_error_message"
      )
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
    const req = await toCreateRequest(info)
    try {
      await connectNativeAndPost<string>({
        method: "create",
        meta: {
          silent: !settings.confirmBeforeDownload
        },
        params: btoa(
          JSON.stringify({
            req
          })
        )
      })

      if (!settings.confirmBeforeDownload) {
        await showNativeNotification(
          "success",
          chrome.i18n.getMessage("notification_create_success"),
          chrome.i18n.getMessage("notification_native_success_message")
        )
      }
    } catch (e) {
      console.error(e)
      if (!settings.confirmBeforeDownload) {
        await showNativeNotification(
          "error",
          chrome.i18n.getMessage("notification_create_error"),
          chrome.i18n.getMessage("notification_native_error_message")
        )
      }
    }
  }
}

function getCookie(url: string, storeId?: string) {
  return new Promise<string>((resolve) => {
    chrome.cookies.getAll({ url, storeId }, (cookies) => {
      resolve(
        cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")
      )
    })
  })
}

async function toCreateRequest(info: DownloadInfo): Promise<Request> {
  const cookie = await getCookie(info.url, (info as any).cookieStoreId)
  return {
    url: info.url,
    extra: {
      header: {
        "User-Agent": navigator.userAgent,
        Cookie: cookie ? cookie : undefined,
        Referer: info.referrer ? info.referrer : undefined
      }
    }
  }
}
