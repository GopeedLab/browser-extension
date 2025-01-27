import CloudDownloadIcon from "@mui/icons-material/CloudDownload"
import GitHubIcon from "@mui/icons-material/GitHub"
import SettingsIcon from "@mui/icons-material/Settings"
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography
} from "@mui/material"
import icon from "data-base64:~assets/icon.png"
import { useState } from "react"

import Theme from "~components/theme"

import BasicSettings from "./components/BasicSettings"
import RemoteSettings from "./components/RemoteSettings"

const Options = () => {
  const [activeMenu, setActiveMenu] = useState("basic")
  const manifest = chrome.runtime.getManifest()

  const menuItems = [
    {
      id: "basic",
      label: chrome.i18n.getMessage("basic_settings"),
      icon: <SettingsIcon />
    },
    {
      id: "remote",
      label: chrome.i18n.getMessage("remote_download"),
      icon: <CloudDownloadIcon />
    }
  ]

  const renderContent = () => {
    switch (activeMenu) {
      case "basic":
        return <BasicSettings />
      case "remote":
        return <RemoteSettings />
      default:
        return null
    }
  }

  return (
    <Theme>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "background.default"
        }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 1200,
            mx: "auto",
            px: 4
          }}>
          <Box
            sx={{
              height: 64,
              display: "flex",
              alignItems: "center"
            }}>
            <Box
              sx={{
                width: 240,
                display: "flex",
                alignItems: "center"
              }}>
              <img
                src={icon}
                alt="Gopeed"
                style={{ width: 32, height: 32 }} // Increased from 24 to 32
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  ml: 1.5, // Increased from ml: 1
                  justifyContent: "center"
                }}>
                <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
                  Gopeed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  v{manifest.version}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }} />
            <IconButton
              color="inherit"
              href="https://github.com/GopeedLab/browser-extension"
              target="_blank"
              size="large">
              <GitHubIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex"
            }}>
            <Box sx={{ width: 240, py: 2 }}>
              <List
                sx={{
                  "& .MuiListItem-root": {
                    borderRadius: 1,
                    my: 0.5,
                    "&.Mui-selected": {
                      bgcolor: "transparent",
                      "& .MuiListItemIcon-root, & .MuiListItemText-root": {
                        color: "primary.main"
                      }
                    }
                  }
                }}>
                {menuItems.map((item) => (
                  <ListItem
                    key={item.id}
                    button
                    selected={activeMenu === item.id}
                    onClick={() => setActiveMenu(item.id)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 4, borderRightWidth: 1 }}
            />
            <Box sx={{ flex: 1, p: 3 }}>{renderContent()}</Box>
          </Box>
        </Box>
      </Box>
    </Theme>
  )
}

export default Options
