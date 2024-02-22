import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import { Alert } from "@mui/material"
import Button from "@mui/material/Button"
import Input from "@mui/material/Input"
import Link from "@mui/material/Link"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import type { PlasmoGetInlineAnchor, PlasmoGetOverlayAnchor } from "plasmo"
import { useEffect, useState } from "react"
import ReactDOM from "react-dom"

// export const getInlineAnchor: PlasmoGetInlineAnchor = async () =>
//   document.querySelector("div.TimelineItem-avatar")

// export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () =>
//   document.querySelector("a.TimelineItem-avatar")

const styleElement = document.createElement("style")

const styleCache = createCache({
  key: "plasmo-mui-cache",
  prepend: true,
  container: styleElement
})

export const getStyle = () => styleElement

function PlasmoOverlay() {
  const [data, setData] = useState("")

  return (
    <CacheProvider value={styleCache}>
      <Stack minWidth={240} bgcolor={"white"} padding={2}>
        <Alert severity="error">This is an error alert — check it out!</Alert>
        <Typography variant="h6">
          Welcome to your{" "}
          <Link href="https://www.plasmo.com" target="_blank">
            Plasmo
          </Link>{" "}
          Extension!
        </Typography>
        <Input onChange={(e) => setData(e.target.value)} value={data} />
        <Button href="https://docs.plasmo.com" target="_blank">
          View Docs
        </Button>
        <Button variant="contained">Hello world</Button>;
      </Stack>
    </CacheProvider>
  )
}

const root = document.createElement('div');
document.body.appendChild(root);

ReactDOM.render(<PlasmoOverlay />, root);
