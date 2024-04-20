import type { CreateTaskWithRequest } from "@gopeed/types"
import { Cancel, Download } from "@mui/icons-material"
import { LoadingButton } from "@mui/lab"
import { Button, Chip, Typography } from "@mui/material"
import Grid from "@mui/material/Unstable_Grid2"
import { useState } from "react"
import { FileIcon } from "react-file-icon"

import { sendToBackground } from "@plasmohq/messaging"

import Theme from "~components/theme"

const iconTypes = {
  "3d": [
    "3d",
    "3ds",
    "3dm",
    "max",
    "obj",
    "lwo",
    "stl",
    "c4d",
    "blend",
    "ma",
    "mb"
  ],
  acrobat: ["pdf"],
  audio: ["mp3", "wav", "flac", "ogg", "m4a"],
  binary: ["bin", "exe", "dll"],
  code: [
    "html",
    "css",
    "js",
    "json",
    "jsx",
    "ts",
    "tsx",
    "php",
    "py",
    "rb",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "go",
    "swift",
    "kt",
    "sh"
  ],
  code2: ["yml", "yaml", "toml"],
  compressed: ["zip", "rar", "7z", "gz", "tar", "bz2", "xz", "z"],
  document: ["doc", "docx", "odt", "rtf", "tex", "txt", "wks", "wps", "wpd"],
  drive: ["gdoc", "gsheet", "gslides", "gdraw"],
  font: ["ttf", "otf", "woff", "woff2", "eot"],
  image: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "psd",
    "ai",
    "tiff",
    "svg",
    "ico",
    "webp"
  ],
  presentation: ["ppt", "pptx", "odp"],
  settings: ["ini", "cfg", "conf", "dmg"],
  spreadsheet: ["xls", "xlsx", "ods", "csv"],
  vector: ["ai", "eps", "ps", "svg"],
  video: ["mp4", "avi", "mkv", "mov", "flv", "wmv", "webm"]
}

function getIconType(extension: string) {
  for (const type in iconTypes) {
    if (iconTypes[type].includes(extension)) {
      return type
    }
  }
  return null
}

function fmtSize(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let unit = 0
  while (size > 1024) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(2)} ${units[unit]}`
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

function Create() {
  const query = new URLSearchParams(window.location.search)
  const asset = JSON.parse(query.get("asset")) as Asset
  const [name, setName] = useState(asset.filename || "unknown")
  const extension = name.split(".").pop()
  const type = extension ? getIconType(extension) : null
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    const cookie = await getCookie(
      asset.finalUrl,
      asset.cookieStoreId ? asset.cookieStoreId : undefined
    )
    try {
      await sendToBackground<CreateTaskWithRequest>({
        name: "api/create",
        body: {
          req: {
            url: asset.finalUrl,
            extra: {
              header: {
                "User-Agent": navigator.userAgent,
                Cookie: cookie ? cookie : undefined,
                Referer: asset.referer ? asset.referer : undefined
              }
            }
          },
          opt: {
            name,
            selectFiles: []
          }
        }
      })
      window.close()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Theme>
      <Grid container justifyContent="center" paddingTop="20px">
        <Grid xs={6}>
          <FileIcon extension={extension} color="aliceblue" type={type} />
        </Grid>
      </Grid>
      <Grid container justifyContent="center" padding="20px">
        <Grid height="40px">
          <Typography
            variant="h5"
            align="center"
            style={{ wordWrap: "break-word" }}>
            {name}
            {asset.filesize > 0 ? (
              <Chip
                label={fmtSize(asset.filesize)}
                sx={{ marginLeft: "5px" }}
              />
            ) : null}
          </Typography>
        </Grid>
      </Grid>
      <Grid container justifyContent="center" paddingTop="60px">
        <Grid xs={8}>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            sx={{ width: "100%" }}
            onClick={window.close}>
            {chrome.i18n.getMessage("cancel")}
          </Button>
        </Grid>
        <Grid xs={8} paddingTop="10px">
          <LoadingButton
            loading={loading}
            variant="outlined"
            color="success"
            startIcon={<Download />}
            sx={{ width: "100%" }}
            onClick={handleDownload}>
            {chrome.i18n.getMessage("download")}
          </LoadingButton>
        </Grid>
      </Grid>
    </Theme>
  )
}

export default Create
