import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import { Alert, AlertTitle, Snackbar } from "@mui/material"
import { useEffect, useState } from "react"

import { usePort } from "@plasmohq/messaging/hook"

import Theme from "~components/theme"

const styleElement = document.createElement("style")

const styleCache = createCache({
  key: "plasmo-mui-cache",
  prepend: true,
  container: styleElement
})

export const getStyle = () => styleElement

function PlasmoOverlay() {
  const notify = usePort("notify")
  const [open, setOpen] = useState(false)
  const [rootFontSize, setRootFontSize] = useState("")

  const handleClose = () => {
    setOpen(false)
    if (rootFontSize) {
      setTimeout(() => {
        document.documentElement.style.fontSize = rootFontSize
      }, 500)
    }
  }

  useEffect(() => {
    if (notify.data) {
      const tempRootFontSize = document.documentElement.style.fontSize
      if (tempRootFontSize && parseInt(tempRootFontSize) > 32) {
        document.documentElement.style.fontSize = null
        setRootFontSize(tempRootFontSize)
      }
      setOpen(true)
    }
  }, [notify.data])

  return (
    <CacheProvider value={styleCache}>
      {notify.data && (
        <Theme>
          <Snackbar
            open={open}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            autoHideDuration={6000}
            onClose={handleClose}>
            <Alert
              onClose={handleClose}
              severity={notify.data.type || "success"}
              icon={
                <img
                  src={chrome.runtime.getURL("assets/icon.png")}
                  alt=""
                  style={{ width: 24, height: 24 }}
                />
              }
              sx={{ width: 320 }}>
              {notify.data.title && (
                <AlertTitle>{notify.data.title}</AlertTitle>
              )}
              {notify.data.message}
            </Alert>
          </Snackbar>
        </Theme>
      )}
    </CacheProvider>
  )
}

export default PlasmoOverlay
