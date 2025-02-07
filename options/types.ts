export interface Settings {
  enabled: boolean
  autoWakeup: boolean
  ctrlDisableCapture: boolean
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
  remote: {
    enabled: boolean
    selectedServer: string
    servers: Server[]
    notification: boolean
  }
}

export const defaultSettings: Settings = {
  enabled: true,
  autoWakeup: true,
  ctrlDisableCapture: true,
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
  remote: {
    enabled: false,
    selectedServer: "",
    servers: [],
    notification: true
  }
}
