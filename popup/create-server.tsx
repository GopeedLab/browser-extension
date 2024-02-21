import { ArrowBack, Save } from "@mui/icons-material"
import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Typography
} from "@mui/material"
import { useTheme } from "@mui/material/styles"
import {
  FormContainer,
  SelectElement,
  TextFieldElement,
  useForm
} from "react-hook-form-mui"

import { useStorage } from "@plasmohq/storage/hook"

import { STORAGE_SERVER_SELECTED, STORAGE_SERVERS } from "~constants"

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

  function handleSave() {
    const server = formContext.getValues()
    server.url = `${server.scheme}://${server.host}:${server.port}`
    // Check if the server is already in the list
    const exists = servers.some((s) => s.url === server.url)
    if (exists) {
      props.onClose()
      return
    }

    if (servers.length === 0) {
      setSelected(server.url)
    }
    setServers([...servers, server])
    props.onClose()
  }

  return (
    <Box
      sx={{ backgroundColor: theme.palette.background.paper, height: "100%" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            aria-label="save"
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
