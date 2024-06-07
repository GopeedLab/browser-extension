import path from "path"
import contentDisposition from "content-disposition"

import { Storage } from "@plasmohq/storage"

import { STORAGE_SERVER_STATUS, STORAGE_SERVERS } from "~constants"
import { getSelectedServer } from "~service/server"

export {}

export type CheckResult = "success" | "network_error" | "token_error"

export async function checkServer(server: Server): Promise<CheckResult> {
  return new Promise(async (resolve) => {
    setTimeout(() => {
      resolve("network_error")
    }, 5000)
    try {
      const resp = await fetch(`${server.url}/api/v1/tasks/0`, {
        headers: {
          "X-Api-Token": server.token
        }
      })
      const json = await resp.json()
      // When the server is available, it should return 2001 (task not found)
      if (json.code !== 2001) {
        resolve("token_error")
        return
      }
      resolve("success")
    } catch (e) {
      resolve("network_error")
    }
  })
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
const isFirefox = process.env.PLASMO_BROWSER === "firefox"
const checkIntervalTime = 1500
const storage = new Storage()
let capture = false

;(async function () {
  // initContextMenus()

  async function checkServerIsAvailable(server: Server): Promise<boolean> {
    const status = await checkServer(server)
    return status === "success"
  }

  async function checkAllServers() {
    const servers = await storage.get<Server[]>(STORAGE_SERVERS)
    if (!servers || servers.length === 0) return

    const serverStatusList = await Promise.all(
      servers.map(checkServerIsAvailable)
    )
    // Check if any server status has changed, this is avoid MAX_WRITE_OPERATIONS_PER_HOUR quota.
    let hasChanged = false
    const prev = await storage.get<Record<string, boolean>>(
      STORAGE_SERVER_STATUS
    )
    if (!prev) {
      hasChanged = true
    } else {
      for (const [index, server] of servers.entries()) {
        const currentStatus = serverStatusList[index]
        if (prev[server.url] !== currentStatus) {
          hasChanged = true
          break
        }
      }
    }

    if (!hasChanged) {
      return
    }

    await storage.set(STORAGE_SERVER_STATUS, {
      ...prev,
      ...Object.fromEntries(
        servers.map((server, index) => [server.url, serverStatusList[index]])
      )
    })
  }

  async function checkAndRefreshCapture() {
    await checkAllServers()
    capture = !!(await getSelectedServer())
  }

  checkAndRefreshCapture()
  setInterval(checkAndRefreshCapture, checkIntervalTime)
})()

// chrome.downloads.onDeterminingFilename only available in Chrome
const downloadEvent =
  chrome.downloads.onDeterminingFilename || chrome.downloads.onCreated

downloadEvent.addListener(async function (item) {
  if (!capture) {
    return
  }
  const finalUrl = item.finalUrl || item.url
  if (finalUrl.startsWith("blob:") || finalUrl.startsWith("data:")) {
    return
  }

  await chrome.downloads.cancel(item.id)
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message)
  }
  if (isFirefox) {
    await chrome.downloads.erase({ id: item.id })
  }

  downloadConfirm({
    filename: path.basename(item.filename.replaceAll("\\", "/")),
    filesize: item.fileSize,
    finalUrl,
    referer: item.referrer,
    cookieStoreId: (item as any).cookieStoreId
  })
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

      downloadConfirm({
        filename,
        filesize,
        finalUrl: res.url,
        referer: (res as any).originUrl,
        cookieStoreId: (res as any).cookieStoreId
      })
      return { cancel: true }
    },
    { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
    ["blocking", "responseHeaders"]
  )
}

function downloadConfirm(asset: Asset) {
  chrome.windows.getCurrent((currentWindow) => {
    const width = 480
    const height = 600
    const left = Math.round(
      (currentWindow.width - width) * 0.5 + currentWindow.left
    )
    const top = Math.round(
      (currentWindow.height - height) * 0.5 + currentWindow.top
    )
    chrome.windows.create({
      url: `tabs/create.html?asset=${encodeURIComponent(
        JSON.stringify(asset)
      )}`,
      type: "popup",
      width,
      height,
      left,
      top
    })
  })
}
