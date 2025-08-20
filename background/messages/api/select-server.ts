import type { PlasmoMessaging } from "@plasmohq/messaging"

export interface ServerSelectionRequest {
  servers: Server[]
  downloadInfo: {
    url: string
    filename: string
  }
}

export interface ServerSelectionResponse {
  selectedServer: string | null
  cancelled: boolean
}

// Store pending server selections
const pendingSelections = new Map<string, {
  resolve: (response: ServerSelectionResponse) => void
  reject: (error: Error) => void
}>()

export function requestServerSelection(
  requestId: string,
  data: ServerSelectionRequest
): Promise<ServerSelectionResponse> {
  return new Promise((resolve, reject) => {
    pendingSelections.set(requestId, { resolve, reject })
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingSelections.has(requestId)) {
        pendingSelections.delete(requestId)
        resolve({ selectedServer: null, cancelled: true })
      }
    }, 30000)
  })
}

const handler: PlasmoMessaging.MessageHandler<ServerSelectionResponse, void> = (
  req,
  res
) => {
  const requestId = req.sender?.tab?.id?.toString() || "unknown"
  const pending = pendingSelections.get(requestId)
  
  if (pending) {
    pendingSelections.delete(requestId)
    pending.resolve(req.body)
  }
  
  res.send()
}

export default handler