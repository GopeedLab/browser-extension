import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Typography
} from "@mui/material"
import { useState, useEffect } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import Theme from "~components/theme"
import { getFullUrl } from "~options/components/RemoteSettings"
import type { ServerSelectionResponse } from "~background/messages/api/select-server"

export interface ServerSelectorProps {
  servers: Server[]
  downloadInfo: {
    url: string
    filename: string
  }
  defaultServer?: string
  onSelection: (response: ServerSelectionResponse) => void
}

function ServerSelector({
  servers,
  downloadInfo,
  defaultServer,
  onSelection
}: ServerSelectorProps) {
  const [selectedServer, setSelectedServer] = useState<string>(
    defaultServer || (servers.length > 0 ? getFullUrl(servers[0]) : "")
  )

  const handleProceed = () => {
    onSelection({
      selectedServer,
      cancelled: false
    })
  }

  const handleCancel = () => {
    onSelection({
      selectedServer: null,
      cancelled: true
    })
  }

  return (
    <Theme>
      <Dialog
        open={true}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            m: 0,
            minWidth: "400px"
          }
        }}>
        <DialogTitle>
          <Typography variant="h6">
            {chrome.i18n.getMessage("select_server")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {chrome.i18n.getMessage("select_server_desc")}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {downloadInfo.filename || downloadInfo.url}
            </Typography>
          </Box>
          <List sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
            {servers.map((server, index) => {
              const fullUrl = getFullUrl(server)
              return (
                <ListItem key={fullUrl} disablePadding>
                  <ListItemButton onClick={() => setSelectedServer(fullUrl)}>
                    <ListItemIcon>
                      <Radio
                        checked={selectedServer === fullUrl}
                        value={fullUrl}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={fullUrl}
                      secondary={
                        defaultServer === fullUrl
                          ? `(${chrome.i18n.getMessage("use_default_server")})`
                          : undefined
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="inherit">
            {chrome.i18n.getMessage("cancel")}
          </Button>
          <Button
            onClick={handleProceed}
            variant="contained"
            disabled={!selectedServer}>
            {chrome.i18n.getMessage("proceed")}
          </Button>
        </DialogActions>
      </Dialog>
    </Theme>
  )
}

interface ServerSelectorState {
  show: boolean
  servers: Server[]
  downloadInfo: {
    url: string
    filename: string
  }
  defaultServer?: string
}

function PlasmoOverlay() {
  const [state, setState] = useState<ServerSelectorState>({
    show: false,
    servers: [],
    downloadInfo: { url: "", filename: "" }
  })

  useEffect(() => {
    const messageListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ) => {
      if (message.name === "show-server-selector") {
        setState({
          show: true,
          servers: message.body.servers,
          downloadInfo: message.body.downloadInfo,
          defaultServer: message.body.defaultServer
        })
        sendResponse({ success: true })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  const handleSelection = async (response: ServerSelectionResponse) => {
    setState((prev) => ({ ...prev, show: false }))
    
    // Send selection back to background script
    await sendToBackground<ServerSelectionResponse, void>({
      name: "api/select-server",
      body: response
    })
  }

  if (!state.show) {
    return <></>
  }

  return (
    <ServerSelector
      servers={state.servers}
      downloadInfo={state.downloadInfo}
      defaultServer={state.defaultServer}
      onSelection={handleSelection}
    />
  )
}

export default PlasmoOverlay