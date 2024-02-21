import { Add, DeleteOutline } from "@mui/icons-material"
import {
  AppBar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  styled,
  Toolbar
} from "@mui/material"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import Theme from "~components/theme"
import {
  STORAGE_SERVER_SELECTED,
  STORAGE_SERVER_STATUS,
  STORAGE_SERVERS
} from "~constants"

import CreateServer from "./create-server"

const StyledBadge = styled(Badge)(({ theme, color }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette[color].main,
    color: theme.palette[color].main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""'
    }
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0
    }
  }
}))

function IndexPopup() {
  const [selected, setSelected] = useStorage<string>(STORAGE_SERVER_SELECTED)
  const [servers, setServers] = useStorage<Server[]>(STORAGE_SERVERS)
  const [serverStatus] = useStorage<Record<string, boolean>>(
    STORAGE_SERVER_STATUS,
    {}
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  function handleDelete(key: string) {
    setServers((prev) => prev.filter((server) => server.url !== key))
    if (selected === key) {
      setSelected(null)
    }
    setDeleteOpen(false)
  }

  return (
    <Theme>
      <Stack width={360} height={512}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {chrome.i18n.getMessage("server")}
            </Typography>
            <IconButton
              aria-label="delete"
              size="large"
              edge="end"
              onClick={() => selected && setDeleteOpen(true)}>
              <DeleteOutline />
            </IconButton>
            <IconButton
              aria-label="add"
              size="large"
              edge="end"
              onClick={() => setAddOpen(true)}>
              <Add />
            </IconButton>
          </Toolbar>
          <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogContent>
              <DialogContentText>
                {chrome.i18n.getMessage("deleteTip")}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteOpen(false)}>
                {chrome.i18n.getMessage("cancel")}
              </Button>
              <Button onClick={() => handleDelete(selected)}>
                {chrome.i18n.getMessage("delete")}
              </Button>
            </DialogActions>
          </Dialog>
        </AppBar>
        <Drawer open={addOpen} anchor="bottom">
          <Box height="100vh">
            <CreateServer onClose={() => setAddOpen(false)} />
          </Box>
        </Drawer>
        {servers?.length > 0 ? (
          <List>
            {servers.map((server) => {
              return (
                <ListItem disablePadding key={server.url}>
                  <ListItemButton onClick={() => setSelected(server.url)}>
                    <ListItemIcon>
                      <Radio
                        value={server.url}
                        checked={selected === server.url}
                        disabled={!serverStatus[server.url]}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={server.title}
                      secondary={server.url}
                    />
                    <StyledBadge
                      variant="dot"
                      sx={{ marginRight: "12px" }}
                      color={serverStatus[server.url] ? "success" : "error"}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        ) : null}
      </Stack>
    </Theme>
  )
}

export default IndexPopup
