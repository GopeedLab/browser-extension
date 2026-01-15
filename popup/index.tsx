import {
  Cancel,
  CheckCircle,
  Dns as DnsIcon,
  Info as InfoIcon,
  NorthEast as NorthEastIcon,
  Settings as SettingsIcon
} from "@mui/icons-material"
import {
  Alert,
  Collapse,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack
} from "@mui/material"
import { useState } from "react"

import Theme from "~components/theme"
import { useSettings } from "~hooks/useSettings"

function IndexPopup() {
  const [settings, setStoredSettings] = useSettings()
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const manifest = chrome.runtime.getManifest()

  const handleEnableToggle = () => {
    setStoredSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleRemoteToggle = () => {
    setErrorMessage(null) // Clear previous error message
    
    if (!settings.remote.enabled && settings.remote.servers.length === 0) {
      // Show error message if no servers configured
      setErrorMessage(chrome.i18n.getMessage("no_server_error"))
      return
    }
    setStoredSettings((prev) => ({
      ...prev,
      remote: { ...prev.remote, enabled: !prev.remote.enabled }
    }))
  }

  const handleSettingsClick = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleRemoteSettingsClick = () => {
    // Navigate to remote settings page
    const optionsUrl = chrome.runtime.getURL('options.html#remote')
    chrome.tabs.create({ url: optionsUrl })
  }

  const handleRemoteServerClick = () => {
    setErrorMessage(null)
    const { servers, selectedServer } = settings.remote
    if (servers.length > 0) {
      // Check if the selected server exists in the server list
      const activeServer = servers.find(
        (s) => `${s.protocol}://${s.url}` === selectedServer
      )

      let targetUrl = ""
      if (activeServer) {
        targetUrl = selectedServer
      } else {
        // Fallback to the first server if no server is selected or the selected server is not found
        const first = servers[0]
        targetUrl = `${first.protocol}://${first.url}`
      }

      if (targetUrl) {
        chrome.tabs.create({ url: targetUrl })
      }
    } else {
      setErrorMessage(chrome.i18n.getMessage("no_server_error"))
    }
  }

  const handleGitHubClick = () => {
    chrome.tabs.create({
      url: "https://github.com/GopeedLab/browser-extension"
    })
  }

  return (
    <Theme>
      <Stack width={220}>
        <Collapse in={!!errorMessage}>
          {errorMessage && (
            <Alert 
              severity="error" 
              onClose={() => setErrorMessage(null)}
              sx={{ 
                m: 1, 
                mb: 0,
                '& .MuiAlert-action': {
                  alignItems: 'flex-start',
                  paddingTop: '2px'
                }
              }}
              action={
                <Link 
                  component="button"
                  variant="caption"
                  sx={{ 
                    color: 'inherit',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3,
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    '&:hover': {
                      textDecoration: 'none',
                      opacity: 0.8
                    }
                  }}
                  onClick={() => {
                    setErrorMessage(null)
                    handleRemoteSettingsClick()
                  }}
                >
                  {chrome.i18n.getMessage("go_to")} <NorthEastIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                </Link>
              }
            >
              {errorMessage}
            </Alert>
          )}
        </Collapse>
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleEnableToggle}>
              <ListItemIcon>
                {settings.enabled ? (
                  <CheckCircle color="success" />
                ) : (
                  <Cancel color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={chrome.i18n.getMessage(
                  settings.enabled ? "enabled" : "disabled"
                )}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleRemoteToggle}>
              <ListItemIcon>
                {settings.remote.enabled ? (
                  <CheckCircle color="success" />
                ) : (
                  <Cancel color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={chrome.i18n.getMessage("remote_download")}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleRemoteServerClick}>
              <ListItemIcon>
                <DnsIcon />
              </ListItemIcon>
              <ListItemText
                primary={chrome.i18n.getMessage("remote_server")}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleSettingsClick}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={chrome.i18n.getMessage("settings")} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleGitHubClick}>
              <ListItemIcon>
                <InfoIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={`v${manifest.version}`} />
            </ListItemButton>
          </ListItem>
        </List>
      </Stack>
    </Theme>
  )
}

export default IndexPopup
