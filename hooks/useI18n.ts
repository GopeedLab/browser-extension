import { useCallback } from "react"

import { getMessage } from "~i18n"

import { useSettings } from "./useSettings"

export function useI18n() {
  const [settings] = useSettings()

  const t = useCallback(
    (key: string, substitutions?: string | string[]) =>
      getMessage(settings.language, key, substitutions),
    [settings.language]
  )

  return { t }
}
