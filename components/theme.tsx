import { createTheme, CssBaseline, ThemeProvider } from "@mui/material"
import type { PropsWithChildren } from "react"
import { useMemo } from "react"

import { useSettings } from "~hooks/useSettings"

const Theme = ({ children }: PropsWithChildren) => {
  const [settings] = useSettings()
  
  const theme = useMemo(() => {
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
