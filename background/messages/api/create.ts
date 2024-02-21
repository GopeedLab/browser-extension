import Client from "@gopeed/rest"
import type { CreateTaskWithRequest } from "@gopeed/types"

import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getSelectedServer } from "~util"

const handler: PlasmoMessaging.MessageHandler<
  CreateTaskWithRequest,
  void
> = async (req, res) => {
  const server = await getSelectedServer()
  const client = new Client({ host: server.url, token: server.token })
  await client.createTask(req.body)
  res.send()
}

export default handler
