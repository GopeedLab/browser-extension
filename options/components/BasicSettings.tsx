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

import { useI18n } from "~hooks/useI18n"
import { useSettings } from "~hooks/useSettings"
import { SUPPORTED_LANGUAGES } from "~i18n"
import { getContrlKey } from "~util"

import SavedTip, { useTip } from "./SavedTip"

const BasicSettings = () => {
  const [settings, setStoredSettings] = useSettings()
  const { t } = useI18n()

  const { showTip, message, setMessage } = useTip()

  const handleChange = (field: string, value: any) => {
    setStoredSettings((prev) => ({ ...prev, [field]: value }))
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

  const getKeyDisplayText = () => {
    const key = getContrlKey()
    return key === "Meta" ? "Command" : "Ctrl"
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {t("download_settings")}
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(t("download_capture"), t("download_capture_tip"))}
            <Switch
              checked={settings.enabled}
              onChange={(e) => handleChange("enabled", e.target.checked)}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              t("confirm_before_download"),
              t("confirm_before_download_desc")
            )}
            <Switch
              checked={settings.confirmBeforeDownload}
              onChange={(e) =>
                handleChange("confirmBeforeDownload", e.target.checked)
              }
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(t("auto_wakeup"), t("auto_wakeup_desc"))}
            <Switch
              checked={settings.autoWakeup}
              onChange={(e) => handleChange("autoWakeup", e.target.checked)}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(
              t("ctrl_disable_capture"),
              t("ctrl_disable_capture_desc").replace(
                "%key%",
                getKeyDisplayText()
              )
            )}
            <Switch
              checked={settings.ctrlDisableCapture}
              onChange={(e) =>
                handleChange("ctrlDisableCapture", e.target.checked)
              }
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(t("domain_filter"), t("domain_filter_desc"))}
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
                  placeholder={t("domain_filter_placeholder")}
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
            {renderLabel(t("file_type_filter"), t("file_type_filter_desc"))}
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
                  placeholder={t("file_type_filter_placeholder")}
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
              t("min_file_size_filter"),
              t("min_file_size_filter_desc")
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
                    inputProps: { min: 0 },
                    endAdornment: (
                      <InputAdornment position="end">MB</InputAdornment>
                    )
                  }}
                />
              )}
            </Box>
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {t("interface_settings")}
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(t("theme_settings"))}
            <Select
              size="small"
              sx={{ width: 200 }}
              value={settings.theme}
              onChange={(e) => handleChange("theme", e.target.value)}>
              <MenuItem value="system">{t("follow_system")}</MenuItem>
              <MenuItem value="light">{t("light_theme")}</MenuItem>
              <MenuItem value="dark">{t("dark_theme")}</MenuItem>
            </Select>
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
            {renderLabel(t("language_settings"))}
            <Select
              size="small"
              sx={{ width: 200 }}
              value={settings.language}
              onChange={(e) => handleChange("language", e.target.value)}>
              {SUPPORTED_LANGUAGES.map(({ code, name }) => (
                <MenuItem key={code} value={code}>
                  {code === "auto" ? t("follow_system") : name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Stack>
      </Box>

      <SavedTip message={message} onClose={() => setMessage(null)} />
    </Stack>
  )
}

export default BasicSettings
