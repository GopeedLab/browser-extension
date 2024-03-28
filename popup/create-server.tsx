import { ArrowBack, Save, Speed } from "@mui/icons-material"
import { LoadingButton } from "@mui/lab"
import {
  Alert,
  AppBar,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Typography
} from "@mui/material"
import { useTheme } from "@mui/material/styles"
import { useState } from "react"
import {
  FormContainer,
  SelectElement,
  TextFieldElement,
  useForm
} from "react-hook-form-mui"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

import type { CheckResult } from "~background"
import { STORAGE_SERVER_SELECTED, STORAGE_SERVERS } from "~constants"

const ERROR_TIPS: Record<CheckResult, string> = {
  success: "",
  network_error: chrome.i18n.getMessage("tip_create_network_error"),
  token_required: chrome.i18n.getMessage("tip_create_token_required"),
  token_error: chrome.i18n.getMessage("tip_create_token_error")
}

function CreateServer(props: { onClose: () => void }) {
  const theme = useTheme()
  const [_, setSelected] = useStorage<string>(STORAGE_SERVER_SELECTED)
  const [servers, setServers] = useStorage<Server[]>(STORAGE_SERVERS, [])
  const formContext = useForm<Server>({
    defaultValues: {
      title: "",
      scheme: "http",
      host: "",
      port: null,
      token: ""
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CheckResult | null>(null)

  function buildServer() {
    const server = formContext.getValues()
    server.url = `${server.scheme}://${server.host}:${server.port}`
    return server
  }

  async function handleSave() {
    setLoading(true)

    try {
      const server = buildServer()
      // Check if the server is already in the list
      const exists = servers.some((s) => s.url === server.url)
      if (exists) {
        props.onClose()
        return
      }

      // Check if the server is available
      const result = await sendToBackground<Server, CheckResult>({
        name: "api/check",
        body: server
      })
      if (result !== "success") {
        setError(result)
        return
      }

      doSave()
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  function doSave() {
    const server = buildServer()
    if (servers.length === 0) {
      setSelected(server.url)
    }
    setServers([...servers, server])
    props.onClose()
  }

  return (
    <Box
      sx={{ backgroundColor: theme.palette.background.paper, height: "100%" }}>
      <Backdrop
        open={loading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Dialog
        open={!!error}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {chrome.i18n.getMessage("tip_create_error")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {`${ERROR_TIPS[error]}${chrome.i18n.getMessage(
              "tip_create_still_save"
            )}`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setError(null)}>
            Cancel
          </Button>
          <Button onClick={doSave}>Confirm</Button>
        </DialogActions>
      </Dialog>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            aria-label="back"
            size="large"
            edge="start"
            onClick={props.onClose}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {chrome.i18n.getMessage("create")}
          </Typography>
          <IconButton
            aria-label="save"
            size="large"
            edge="end"
            onClick={formContext.handleSubmit(handleSave)}>
            <Save />
          </IconButton>
        </Toolbar>
      </AppBar>
      <FormContainer formContext={formContext} reValidateMode="onChange">
        <Stack spacing={2} sx={{ padding: "20px" }}>
          <TextFieldElement
            required
            label={chrome.i18n.getMessage("title")}
            name="title"
          />
          <SelectElement
            required
            label={chrome.i18n.getMessage("scheme")}
            name="scheme"
            options={[
              {
                id: "http",
                label: "HTTP"
              },
              {
                id: "https",
                label: "HTTPS"
              }
            ]}
          />
          <TextFieldElement
            required
            label={chrome.i18n.getMessage("server")}
            name="host"
          />
          <TextFieldElement
            required
            label={chrome.i18n.getMessage("port")}
            name="port"
            type="number"
            validation={{ min: 1, max: 65535 }}
          />
          <TextFieldElement
            label={chrome.i18n.getMessage("token")}
            name="token"
            type="password"
          />
        </Stack>
      </FormContainer>
    </Box>
  )
}

export default CreateServer
