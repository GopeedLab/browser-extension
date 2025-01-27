import type { PlasmoMessaging } from "@plasmohq/messaging"

export type CheckResult = "success" | "network_error" | "token_error"

async function checkServer(server: Server): Promise<CheckResult> {
  return new Promise(async (resolve) => {
    setTimeout(() => {
      resolve("network_error")
    }, 3000)
    try {
      const resp = await fetch(
        `${server.protocol}://${server.url}/api/v1/info`,
        {
          headers: {
            "X-Api-Token": server.token
          }
        }
      )
      const json = await resp.json()
      // When the server is available, it should return 0 and data.version should exist
      if (json.code === 0 && json.data?.version) {
        resolve("success")
        return
      }
      resolve("token_error")
    } catch (e) {
      resolve("network_error")
    }
  })
}

const handler: PlasmoMessaging.MessageHandler<Server, CheckResult> = async (
  req,
  res
) => {
  const result = await checkServer(req.body)
  res.send(result)
}

export default handler
