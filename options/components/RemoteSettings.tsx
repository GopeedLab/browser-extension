import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Radio,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material"
import { useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

import type { CheckResult } from "~background/messages/api/check"
import { STORAGE_SETTINGS } from "~constants"

import { defaultSettings, type Settings } from "../types"
import SavedTip, { useTip } from "./SavedTip"

interface ServerFormData extends Server {
  error?: string
  testing?: boolean
}

export const getFullUrl = (server: Server) =>
  `${server.protocol}://${server.url}`

export default function RemoteSettings() {
  const [settings, setSettings] = useStorage<Settings>(
    STORAGE_SETTINGS,
    defaultSettings
  )
  const { showTip, message, setMessage } = useTip()
  const [open, setOpen] = useState(false)
  const [editingServerUrl, setEditingServerUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState<ServerFormData>({
    protocol: "http",
    url: "",
    token: ""
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Server | null>(null)

  const handleToggleEnabled = (checked: boolean) => {
    if (checked && settings.remote.servers.length === 0) {
      showTip("no_server_error", "error")
      return
    }
    setSettings({
      ...settings,
      remote: { ...settings.remote, enabled: checked }
    })
    showTip()
  }

  const handleServerSelect = (fullUrl: string) => {
    setSettings({
      ...settings,
      remote: { ...settings.remote, selectedServer: fullUrl }
    })
    showTip()
  }

  const handleAddServer = () => {
    setEditingServerUrl(null)
    setFormData({ protocol: "http", url: "", token: "" })
    setOpen(true)
  }

  const handleEditServer = (server: Server) => {
    setEditingServerUrl(getFullUrl(server))
    setFormData({
      protocol: server.protocol,
      url: server.url,
      token: server.token
    })
    setOpen(true)
  }

  const handleDeleteConfirm = (server: Server) => {
    setDeleteConfirm(server)
  }

  const handleDeleteServer = () => {
    if (!deleteConfirm) return
    const fullUrl = getFullUrl(deleteConfirm)
    const newServers = settings.remote.servers.filter(
      (s) => getFullUrl(s) !== fullUrl
    )

    // When deleting the last server, clear selection and disable remote download
    const isLastServer = newServers.length === 0
    setSettings({
      ...settings,
      remote: {
        ...settings.remote,
        servers: newServers,
        selectedServer: isLastServer
          ? ""
          : settings.remote.selectedServer === fullUrl
          ? ""
          : settings.remote.selectedServer,
        enabled: isLastServer ? false : settings.remote.enabled
      }
    })
    setDeleteConfirm(null)
    showTip()
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, url: e.target.value })
  }

  const handleSubmitServer = () => {
    if (!formData.url.trim()) {
      setFormData({
        ...formData,
        error: chrome.i18n.getMessage("server_url_required")
      })
      return
    }

    const newServer = {
      protocol: formData.protocol,
      url: formData.url,
      token: formData.token
    }

    let newServers: Server[]
    if (editingServerUrl) {
      newServers = settings.remote.servers.map((s) =>
        getFullUrl(s) === editingServerUrl ? newServer : s
      )
    } else {
      newServers = [...settings.remote.servers, newServer]
    }

    // When adding the first server, automatically select it but don't enable remote download
    const isFirstServer = settings.remote.servers.length === 0
    setSettings({
      ...settings,
      remote: {
        ...settings.remote,
        servers: newServers,
        selectedServer: isFirstServer
          ? getFullUrl(newServer)
          : settings.remote.selectedServer
      }
    })
    showTip()
    setOpen(false)
  }

  const handleTestServer = async () => {
    setFormData((prev) => ({ ...prev, testing: true }))

    try {
      // Check if the server is available
      const result = await sendToBackground<Server, CheckResult>({
        name: "api/check",
        body: formData
      })
      switch (result) {
        case "success":
          showTip("test_success")
          break
        case "network_error":
          showTip("test_network_error", "error")
          break
        case "token_error":
          showTip("test_token_error", "error")
          break
      }
    } catch (error) {
      console.error(error)
    } finally {
      setFormData((prev) => ({ ...prev, testing: false }))
    }
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

  if (!settings) return null

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
        {renderLabel(
          chrome.i18n.getMessage("enable_remote_download"),
          chrome.i18n.getMessage("enable_remote_download_desc")
        )}
        <Switch
          checked={settings.remote.enabled}
          onChange={(e) => handleToggleEnabled(e.target.checked)}
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", px: 1 }}>
        {renderLabel(
          chrome.i18n.getMessage("download_notification"),
          chrome.i18n.getMessage("download_notification_desc")
        )}
        <Switch
          checked={settings.remote.notification}
          onChange={(e) => {
            setSettings({
              ...settings,
              remote: { ...settings.remote, notification: e.target.checked }
            })
            showTip()
          }}
          disabled={!settings.remote.enabled}
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", px: 1 }}>
        <Typography sx={{ flex: 1 }}>
          {chrome.i18n.getMessage("download_servers")}
        </Typography>
        <Button variant="contained" size="small" onClick={handleAddServer}>
          {chrome.i18n.getMessage("add")}
        </Button>
      </Box>

      {settings.remote.servers.length > 0 && (
        <Box
          sx={{
            bgcolor: "action.hover",
            borderRadius: 1
          }}>
          <List disablePadding>
            {settings.remote.servers.map((server, index) => {
              const fullUrl = getFullUrl(server)
              return (
                <ListItem
                  key={fullUrl}
                  sx={{
                    borderBottom:
                      index === settings.remote.servers.length - 1 ? 0 : 1,
                    borderColor: "divider",
                    "&:hover": {
                      bgcolor: "action.selected"
                    }
                  }}>
                  <Radio
                    checked={settings.remote.selectedServer === fullUrl}
                    onChange={() => handleServerSelect(fullUrl)}
                    disabled={!settings.remote.enabled}
                  />
                  <ListItemText primary={fullUrl} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditServer(server)}
                      sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteConfirm(server)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              )
            })}
          </List>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {editingServerUrl
            ? chrome.i18n.getMessage("edit_server")
            : chrome.i18n.getMessage("add_server")}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>{chrome.i18n.getMessage("protocol")}</InputLabel>
            <Select
              label={chrome.i18n.getMessage("protocol")}
              value={formData.protocol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  protocol: e.target.value as any
                })
              }>
              <MenuItem value="http">HTTP</MenuItem>
              <MenuItem value="https">HTTPS</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            placeholder="127.0.0.1:9999"
            label={chrome.i18n.getMessage("server_url")}
            fullWidth
            value={formData.url}
            onChange={handleUrlChange}
            error={Boolean(formData.error)}
            helperText={formData.error}
          />
          <TextField
            margin="dense"
            type="password"
            label={chrome.i18n.getMessage("token")}
            fullWidth
            value={formData.token}
            onChange={(e) =>
              setFormData({ ...formData, token: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleTestServer}
              disabled={!formData.url.trim() || formData.testing}
              sx={{
                minWidth: formData.testing ? 40 : undefined,
                width: formData.testing ? 40 : undefined
              }}>
              {formData.testing ? (
                <CircularProgress size={16} />
              ) : (
                chrome.i18n.getMessage("test_server")
              )}
            </Button>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOpen(false)}>
            {chrome.i18n.getMessage("cancel")}
          </Button>
          <Button
            onClick={handleSubmitServer}
            disabled={!formData.url.trim() || formData.testing}>
            {chrome.i18n.getMessage("save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>{chrome.i18n.getMessage("delete")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {chrome.i18n.getMessage("deleteTip")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>
            {chrome.i18n.getMessage("cancel")}
          </Button>
          <Button onClick={handleDeleteServer} color="error">
            {chrome.i18n.getMessage("delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <SavedTip message={message} onClose={() => setMessage(null)} />
    </Stack>
  )
}
