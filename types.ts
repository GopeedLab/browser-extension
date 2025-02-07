interface Server {
  protocol: "http" | "https"
  url: string
  token?: string
}

type PlatformOS = "mac" | "windows" | "linux"
