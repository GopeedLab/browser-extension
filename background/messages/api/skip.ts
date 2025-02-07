import type { PlasmoMessaging } from "@plasmohq/messaging"

export let skip = false

const handler: PlasmoMessaging.MessageHandler<boolean, void> = (req, res) => {
  skip = req.body
  res.send()
}

export default handler
