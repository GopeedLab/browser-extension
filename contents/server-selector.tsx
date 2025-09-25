import {
  Box,
  Button,
  CircularProgress,
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
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import type { ServerSelectionResponse } from "~background/messages/api/select-server"
import Theme from "~components/theme"
import { getFullUrl } from "~options/components/RemoteSettings"

export interface ServerSelectorProps {
  servers: Server[]
  downloadInfo: {
    url: string
    filename: string
  }
  defaultServer?: string
  requestId?: string
  onSelection: (response: ServerSelectionResponse) => void
  onDownloadResult?: (success: boolean) => void
}

function ServerSelector({
  servers,
  downloadInfo,
  defaultServer,
  requestId,
  onSelection,
  onDownloadResult
}: ServerSelectorProps) {
  const [selectedServer, setSelectedServer] = useState<string>(
    defaultServer || (servers.length > 0 ? getFullUrl(servers[0]) : "")
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleProceed = async () => {
    setIsLoading(true)
    onSelection({
      selectedServer,
      cancelled: false
    })
    // Don't close dialog immediately, wait for download result
  }

  const handleCancel = () => {
    onSelection({
      selectedServer: null,
      cancelled: true
    })
  }

  const handleDownloadResult = (success: boolean) => {
    setIsLoading(false)
    if (onDownloadResult) {
      onDownloadResult(success)
    }
  }

  // Listen for download results
  useEffect(() => {
    if (!requestId) return
    
    const messageListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ) => {
      if (message.name === "download-result" && message.body.requestId === requestId) {
        handleDownloadResult(message.body.success)
        sendResponse({ success: true })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [requestId])

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
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {downloadInfo.filename || downloadInfo.url}
            </Typography>
          </Box>
          <List sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
            {servers.map((server) => {
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
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancel} 
            color="inherit" 
            disabled={isLoading}
          >
            {chrome.i18n.getMessage("cancel")}
          </Button>
          <Button
            onClick={handleProceed}
            variant="contained"
            disabled={!selectedServer || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {chrome.i18n.getMessage("confirm")}
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
  requestId?: string
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
          defaultServer: message.body.defaultServer,
          requestId: message.body.requestId
        })
        sendResponse({ success: true })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  const handleSelection = async (response: ServerSelectionResponse) => {
    // Don't close dialog immediately if not cancelled, wait for download result
    if (response.cancelled) {
      setState((prev) => ({ ...prev, show: false }))
    }
    
    // Send selection back to background script
    await sendToBackground<ServerSelectionResponse, void>({
      name: "api/select-server",
      body: response
    })
  }

  const handleDownloadResult = (success: boolean) => {
    if (success) {
      // Close dialog on success
      setState((prev) => ({ ...prev, show: false }))
    }
    // On failure, keep dialog open (user can try again or cancel)
  }

  if (!state.show) {
    return <></>
  }

  return (
    <ServerSelector
      servers={state.servers}
      downloadInfo={state.downloadInfo}
      defaultServer={state.defaultServer}
      requestId={state.requestId}
      onSelection={handleSelection}
      onDownloadResult={handleDownloadResult}
    />
  )
}

export default PlasmoOverlay