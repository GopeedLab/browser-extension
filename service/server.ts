import { Storage } from "@plasmohq/storage"

import {
  STORAGE_SERVER_SELECTED,
  STORAGE_SERVER_STATUS,
  STORAGE_SERVERS
} from "~constants"

const storage = new Storage()

/**
 * Get the selected server, if it exists and available
 * @returns
 */
export async function getSelectedServer(): Promise<Server | null> {
  const selected = await storage.get<string>(STORAGE_SERVER_SELECTED)
  if (!selected) {
    return null
  }
  const servers = await storage.get<Server[]>(STORAGE_SERVERS)
  if (!servers) {
    return null
  }
  const server = servers.find((s) => s.url === selected)
  if (!server) {
    return null
  }
  const serverStatus = await storage.get<Record<string, boolean>>(
    STORAGE_SERVER_STATUS
  )
  if (serverStatus?.[server.url] !== true) {
    return null
  }
  return server
}
