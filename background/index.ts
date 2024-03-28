import sniffer from "url:~/pages/sniffer.tsx"

import { Storage } from "@plasmohq/storage"

import { STORAGE_SERVER_STATUS, STORAGE_SERVERS } from "~constants"
import { getSelectedServer } from "~util"

export {}

export type CheckResult = "success" | "network_error" | "token_error"

export async function checkServer(server: Server): Promise<CheckResult> {
  try {
    const resp = await fetch(`${server.url}/api/v1/tasks/0`, {
      headers: {
        "X-Api-Token": server.token
      }
    })
    const json = await resp.json()
    // When the server is available, it should return 2001 (task not found)
    if (json.code !== 2001) {
      return "token_error"
    }
    return "success"
  } catch (e) {
    return "network_error"
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

;(async function () {
  // initContextMenus()

  const storage = new Storage()

  async function checkAllServers() {
    const servers = await storage.get<Server[]>(STORAGE_SERVERS)
    if (!servers || servers.length === 0) return
    await Promise.all(
      servers.map(async (server) => {
        const status = await checkServer(server)
        const prev = await storage.get<Record<string, boolean>>(
          STORAGE_SERVER_STATUS
        )
        await storage.set(STORAGE_SERVER_STATUS, {
          ...prev,
          [server.url]: status === "success"
        })
      })
    )
  }
  checkAllServers()
  setInterval(checkAllServers, 3000)
})()

chrome.downloads.onDeterminingFilename.addListener(async function (item) {
  const server = await getSelectedServer()
  if (!server) return

  await chrome.downloads.cancel(item.id)
  if (item.state === "complete") {
    await chrome.downloads.removeFile(item.id)
  }

  chrome.system.display.getInfo({ singleUnified: true }, (info) => {
    const wDimension = info[0].workArea
    const { top, left, height, width } = wDimension
    const w = 480
    const h = 600
    const l = width / 2 - w / 2 + left
    const t = height / 2 - h / 2 + top
    const asset = <Asset>{
      filename: item.filename,
      filesize: item.fileSize,
      finalUrl: item.finalUrl
    }

    chrome.windows.create({
      url: `tabs/create.html?asset=${encodeURIComponent(
        JSON.stringify(asset)
      )}`,
      type: "popup",
      width: w,
      height: h,
      left: Math.round(l),
      top: Math.round(t)
    })
  })
})
