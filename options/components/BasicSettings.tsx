import {
  Box,
  Divider,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material"

import { useStorage } from "@plasmohq/storage/hook"

import { STORAGE_SETTINGS } from "~constants"

import { defaultSettings, type Settings } from "../types"
import SavedTip, { useTip } from "./SavedTip"

const BasicSettings = () => {
  const [settings, setSettings] = useStorage<Settings>(
    STORAGE_SETTINGS,
    defaultSettings
  )
  const { showTip, message, setMessage } = useTip()

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    showTip()
  }

  const renderLabel = (label: string, description?: string) => (
    <Stack spacing={0.5} sx={{ flex: 1 }}>
      <Typography>{label}</Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.3 }}>
          {description}
        </Typography>
      )}
    </Stack>
  )

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {chrome.i18n.getMessage("download_settings")}
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              chrome.i18n.getMessage("download_capture"),
              chrome.i18n.getMessage("download_capture_tip")
            )}
            <Switch
              checked={settings.enabled}
              onChange={(e) => handleChange("enabled", e.target.checked)}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              chrome.i18n.getMessage("auto_wakeup"),
              chrome.i18n.getMessage("auto_wakeup_desc")
            )}
            <Switch
              checked={settings.autoWakeup}
              onChange={(e) => handleChange("autoWakeup", e.target.checked)}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              chrome.i18n.getMessage("domain_filter"),
              chrome.i18n.getMessage("domain_filter_desc")
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 300
              }}>
              <Switch
                checked={settings.excludeDomains.enabled}
                onChange={(e) =>
                  handleChange("excludeDomains", {
                    ...settings.excludeDomains,
                    enabled: e.target.checked
                  })
                }
              />
              {settings.excludeDomains.enabled && (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  sx={{ mt: 1 }}
                  placeholder={chrome.i18n.getMessage(
                    "domain_filter_placeholder"
                  )}
                  value={settings.excludeDomains.list}
                  onChange={(e) =>
                    handleChange("excludeDomains", {
                      ...settings.excludeDomains,
                      list: e.target.value
                    })
                  }
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              chrome.i18n.getMessage("file_type_filter"),
              chrome.i18n.getMessage("file_type_filter_desc")
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 300
              }}>
              <Switch
                checked={settings.excludeFileTypes.enabled}
                onChange={(e) =>
                  handleChange("excludeFileTypes", {
                    ...settings.excludeFileTypes,
                    enabled: e.target.checked
                  })
                }
              />
              {settings.excludeFileTypes.enabled && (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  sx={{ mt: 1 }}
                  placeholder={chrome.i18n.getMessage(
                    "file_type_filter_placeholder"
                  )}
                  value={settings.excludeFileTypes.list}
                  onChange={(e) =>
                    handleChange("excludeFileTypes", {
                      ...settings.excludeFileTypes,
                      list: e.target.value
                    })
                  }
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              chrome.i18n.getMessage("min_file_size_filter"),
              chrome.i18n.getMessage("min_file_size_filter_desc")
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 300
              }}>
              <Switch
                checked={settings.minFileSize.enabled}
                onChange={(e) =>
                  handleChange("minFileSize", {
                    ...settings.minFileSize,
                    enabled: e.target.checked
                  })
                }
              />
              {settings.minFileSize.enabled && (
                <TextField
                  type="number"
                  size="small"
                  sx={{ mt: 1, width: 200 }}
                  value={settings.minFileSize.value}
                  onChange={(e) =>
                    handleChange("minFileSize", {
                      ...settings.minFileSize,
                      value: e.target.value
                    })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">MB</InputAdornment>
                    )
                  }}
                />
              )}
            </Box>
          </Box>
          {/* 删除通知设置部分 */}
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {chrome.i18n.getMessage("interface_settings")}
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(chrome.i18n.getMessage("theme_settings"))}
            <Select
              size="small"
              sx={{ width: 200 }}
              value={settings.theme}
              onChange={(e) => handleChange("theme", e.target.value)}>
              <MenuItem value="system">
                {chrome.i18n.getMessage("follow_system")}
              </MenuItem>
              <MenuItem value="light">
                {chrome.i18n.getMessage("light_theme")}
              </MenuItem>
              <MenuItem value="dark">
                {chrome.i18n.getMessage("dark_theme")}
              </MenuItem>
            </Select>
          </Box>
        </Stack>
      </Box>

      <SavedTip message={message} onClose={() => setMessage(null)} />
    </Stack>
  )
}

export default BasicSettings
