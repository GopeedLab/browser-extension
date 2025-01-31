import { Alert, Snackbar } from "@mui/material"
import { useState } from "react"

type MessageType = "success" | "error"
interface Message {
  type: MessageType
  text: string
}

export const useTip = () => {
  const [message, setMessage] = useState<Message | null>(null)

  const showTip = (
    text: string = "settings_saved",
    type: MessageType = "success"
  ) => {
    setMessage({ type, text })
  }

  return { message, setMessage, showTip }
}

const SavedTip = ({
  message,
  onClose
}: {
  message: Message | null
  onClose: () => void
}) => {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={2000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}>
      {message ? ( // 只在有消息时渲染 Alert
        <Alert severity={message.type} sx={{ width: "100%" }}>
          {message.text && chrome.i18n.getMessage(message.text)}
        </Alert>
      ) : null}
    </Snackbar>
  )
}

export default SavedTip
