import path from "path"
import Client from "@gopeed/rest"
import { type Request } from "@gopeed/types"
import contentDisposition from "content-disposition"
import icon from "data-base64:~assets/icon.png"

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

// chrome.downloads.onDeterminingFilename only available in Chrome
const downloadEvent =
  chrome.downloads.onDeterminingFilename || chrome.downloads.onCreated

downloadEvent.addListener(async function (item) {
  const finalUrl = item.finalUrl || item.url
  if (finalUrl.startsWith("blob:") || finalUrl.startsWith("data:")) {
    return
  }

  const settings =
    (await storage.get<Settings>(STORAGE_SETTINGS)) || defaultSettings
  if (settings.enabled === false) {
    return
  }
  if (settings.excludeDomains.enabled) {
    const excludes = settings.excludeDomains.list.split("\n")
    const host = new URL(item.url).host
    if (excludes.includes(host)) {
      return
    }
  }
  if (settings.excludeFileTypes.enabled && item.filename) {
    const excludes = settings.excludeFileTypes.list
      .split("\n")
      .map((ext) => ext.trim().toLowerCase())
    const ext = path.extname(item.filename).toLowerCase()
    if (excludes.includes(ext)) {
      return
    }
  }
  if (settings.minFileSize.enabled && item.fileSize) {
    if (item.fileSize < settings.minFileSize.value) {
      return
    }
  }

  let handler: Function | undefined
  if (settings.remote.enabled === true) {
    handler = await handleRemoteDownload(item, settings)
  } else {
    handler = await handleNativeDownload(item, settings)
  }
  if (!handler) {
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
      if (res.statusCode !== 200) {
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

      return { cancel: true }
    },
    { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
    ["blocking", "responseHeaders"]
  )
}

async function handleRemoteDownload(
  item: chrome.downloads.DownloadItem,
  settings: Settings
): Promise<Function | undefined> {
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
    let notificationTitle: string
    let notificationMessage: string
    try {
      await client.createTask({
        req: await toCreateRequest(item)
      })
      notificationTitle = chrome.i18n.getMessage("notification_create_success")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_success_message"
      )
    } catch (e) {
      console.error("createTask error", e)
      console.error(e)
      notificationTitle = chrome.i18n.getMessage("notification_create_error")
      notificationMessage = chrome.i18n.getMessage(
        "notification_create_error_message"
      )
    }
    if (settings.remote.notification) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: icon,
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

async function handleNativeDownload(
  item: chrome.downloads.DownloadItem,
  settings: Settings
): Promise<Function | undefined> {
  if (!settings.autoWakeup) {
    try {
      const resp = await connectNativeAndPost({
        method: "ping"
      })
      const isRunning = resp?.data || false
      if (!isRunning) {
        return
      }
    } catch (e) {
      console.error(e)
      return
    }
  }

  return async () => {
    const req = await toCreateRequest(item)
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

async function toCreateRequest(
  item: chrome.downloads.DownloadItem
): Promise<Request> {
  const cookie = await getCookie(item.finalUrl, (item as any).cookieStoreId)
  return {
    url: item.finalUrl,
    extra: {
      header: {
        "User-Agent": navigator.userAgent,
        Cookie: cookie ? cookie : undefined,
        Referer: item.referrer ? item.referrer : undefined
      }
    }
  }
}
