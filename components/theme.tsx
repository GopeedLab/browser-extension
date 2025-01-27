import { createTheme, CssBaseline, ThemeProvider } from "@mui/material"
import type { PropsWithChildren } from "react"
import { useMemo } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { STORAGE_SETTINGS } from "~constants"
import { defaultSettings, type Settings } from "~options/types"

const Theme = ({ children }: PropsWithChildren) => {
  const [settings] = useStorage<Settings>(STORAGE_SETTINGS, defaultSettings)

  const theme = useMemo(() => {
    // 判断是否跟随系统
    const prefersDarkMode =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : settings.theme === "dark"

    return createTheme({
      palette: {
        mode: prefersDarkMode ? "dark" : "light",
        primary: {
          main: "#79C476"
        }
      }
    })
  }, [settings.theme])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export default Theme
