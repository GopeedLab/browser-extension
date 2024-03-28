import type { PlasmoMessaging } from "@plasmohq/messaging"

import { checkServer, type CheckResult } from "~background"

const handler: PlasmoMessaging.MessageHandler<Server, CheckResult> = async (
  req,
  res
) => {
  const result = await checkServer(req.body)
  res.send(result)
}

export default handler
