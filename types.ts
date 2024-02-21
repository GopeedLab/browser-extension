interface Asset {
  filename: string
  filesize: number
  finalUrl: string
}

interface Server {
  url: string
  title: string
  scheme: "http" | "https"
  host: string
  port: number
  token?: string
}