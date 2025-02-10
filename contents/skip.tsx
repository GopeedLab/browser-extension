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
        handleBlur()
      }
    }

    const handleBlur = () => {
      isPressed = false
      sendToBackground<boolean, void>({
        name: "api/skip",
        body: false
      })
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  return <></>
}

export default PlasmoOverlay
