import type { Language } from "~i18n"
import type { Server } from "~types"

export interface Settings {
  enabled: boolean
  autoWakeup: boolean
  ctrlDisableCapture: boolean
  confirmBeforeDownload: boolean
  excludeDomains: {
    enabled: boolean
    list: string
  }
  excludeFileTypes: {
    enabled: boolean
    list: string
  }
  minFileSize: {
    enabled: boolean
    value: number
  }
  theme: "system" | "light" | "dark"
  language: Language
  remote: {
    enabled: boolean
    selectedServer: string
    servers: Server[]
    notification: boolean
    requireManualSelection: boolean
  }
}

export const defaultSettings: Settings = {
  enabled: true,
  autoWakeup: true,
  ctrlDisableCapture: true,
  confirmBeforeDownload: true,
  excludeDomains: {
    enabled: false,
    list: ""
  },
  excludeFileTypes: {
    enabled: false,
    list: ""
  },
  minFileSize: {
    enabled: false,
    value: 0
  },
  theme: "system",
  language: "auto",
  remote: {
    enabled: false,
    selectedServer: "",
    servers: [],
    notification: true,
    requireManualSelection: false
  }
}
