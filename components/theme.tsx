import { CssBaseline } from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"

const darkTheme = createTheme({
  palette: {
    mode: "dark"
  }
})

export default function Theme(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {props.children}
    </ThemeProvider>
  )
}
