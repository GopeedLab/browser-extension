import {
  Cancel,
  CheckCircle,
  Info as InfoIcon, // 添加 Info 图标
  Settings as SettingsIcon
} from "@mui/icons-material"
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack
} from "@mui/material"

import { useStorage } from "@plasmohq/storage/hook"

import Theme from "~components/theme"
import { STORAGE_SETTINGS } from "~constants"
import { defaultSettings, type Settings } from "~options/types"

function IndexPopup() {
  const [settings, setSettings] = useStorage<Settings>(
    STORAGE_SETTINGS,
    defaultSettings
  )
  const manifest = chrome.runtime.getManifest()

  const handleEnableToggle = () => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleSettingsClick = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleGitHubClick = () => {
    chrome.tabs.create({
      url: "https://github.com/GopeedLab/browser-extension"
    })
  }

  return (
    <Theme>
      <Stack width={220}>
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
