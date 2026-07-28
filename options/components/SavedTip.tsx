import { Alert, Snackbar } from "@mui/material"
import { useState } from "react"

import { useI18n } from "~hooks/useI18n"

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
  const { t } = useI18n()

  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={2000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}>
      <Alert
        severity={message?.type || "success"}
        sx={{
          width: "100%",
          visibility: message ? "visible" : "hidden"
        }}>
        {message?.text ? t(message.text) : ""}
      </Alert>
    </Snackbar>
  )
}

export default SavedTip
