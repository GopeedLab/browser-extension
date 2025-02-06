import path from "path"
import Client from "@gopeed/rest"
import { type Request } from "@gopeed/types"
import contentDisposition from "content-disposition"

import { getPort } from "@plasmohq/messaging/background"
import { Storage } from "@plasmohq/storage"

import { STORAGE_SETTINGS } from "~constants"
import { getFullUrl } from "~options/components/RemoteSettings"
import { defaultSettings, type Settings } from "~options/types"

export {}

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
  const settings =
    (await storage.get<Settings>(STORAGE_SETTINGS)) || defaultSettings
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
      downloadEventSkip = false

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

      downloadEventSkip = true

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
  const server = settings.remote.servers.find(
    (server) => getFullUrl(server) === settings.remote.selectedServer
  )
  if (!server) {
    return
  }

  return async () => {
    const client = new Client({
      host: getFullUrl(server),
      token: server.token
    })
    let notificationType: string
    let notificationTitle: string
    let notificationMessage: string
    try {
      await client.createTask({
        req: await toCreateRequest(info)
      })
      notificationTitle = chrome.i18n.getMessage("notification_create_success")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_success_message"
      )
    } catch (e) {
      console.error(e)
      notificationType = "error"
      notificationTitle = chrome.i18n.getMessage("notification_create_error")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_error_message"
      )
    }
    if (settings.remote.notification) {
      const port = getPort("notify")
      port.postMessage({
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage
      })
    }
  }
}

interface HostRequest<T> {
  method: string
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
        params: btoa(
          JSON.stringify({
            req
          })
        )
      })
    } catch (e) {
      console.error(e)
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
