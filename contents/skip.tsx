import { useEffect } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { getContrlKey } from "~util"

const contrlKey = getContrlKey()

function PlasmoOverlay() {
  useEffect(() => {
    let isPressed = false
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === contrlKey && !isPressed) {
        isPressed = true
        sendToBackground<boolean, void>({
          name: "api/skip",
          body: true
        })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === contrlKey) {
        isPressed = false
        sendToBackground<boolean, void>({
          name: "api/skip",
          body: false
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  return <></>
}

export default PlasmoOverlay
