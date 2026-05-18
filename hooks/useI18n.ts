import { createContext, useContext } from "react"

export type GetMessage = (
  key: string,
  substitutions?: string | string[]
) => string

interface I18nContextType {
  getMessage: GetMessage
}

export const I18nContext = createContext<I18nContextType>({
  getMessage: (key, substitutions) => chrome.i18n.getMessage(key, substitutions)
})

export const useI18n = () => useContext(I18nContext)
