import { createTheme, CssBaseline, ThemeProvider } from "@mui/material"
import type { PropsWithChildren } from "react"
import { useMemo } from "react"

import { I18nContext, type GetMessage } from "~hooks/useI18n"
import { useSettings } from "~hooks/useSettings"
import * as deMessages from "~locales/de/messages.json"
import * as enMessages from "~locales/en/messages.json"
import * as esMessages from "~locales/es/messages.json"
import * as frMessages from "~locales/fr/messages.json"
import * as itMessages from "~locales/it/messages.json"
import * as jaMessages from "~locales/ja/messages.json"
import * as koMessages from "~locales/ko/messages.json"
import * as ptBrMessages from "~locales/pt_BR/messages.json"
import * as ruMessages from "~locales/ru/messages.json"
import * as trMessages from "~locales/tr/messages.json"
import * as ukMessages from "~locales/uk/messages.json"
import * as zhMessages from "~locales/zh/messages.json"

type MessageRecord = Record<string, { message: string }>

const localeMessages: Record<string, MessageRecord> = {
  de: deMessages as unknown as MessageRecord,
  en: enMessages as unknown as MessageRecord,
  es: esMessages as unknown as MessageRecord,
  fr: frMessages as unknown as MessageRecord,
  it: itMessages as unknown as MessageRecord,
  ja: jaMessages as unknown as MessageRecord,
  ko: koMessages as unknown as MessageRecord,
  pt_BR: ptBrMessages as unknown as MessageRecord,
  ru: ruMessages as unknown as MessageRecord,
  tr: trMessages as unknown as MessageRecord,
  uk: ukMessages as unknown as MessageRecord,
  zh: zhMessages as unknown as MessageRecord
}

function createGetMessage(language: string): GetMessage {
  if (!language) {
    return (key, substitutions) => chrome.i18n.getMessage(key, substitutions)
  }
  const messages = localeMessages[language]
  if (!messages) {
    return (key, substitutions) => chrome.i18n.getMessage(key, substitutions)
  }
  return (key: string, substitutions?: string | string[]) => {
    const entry = messages[key]
    if (!entry) {
      return chrome.i18n.getMessage(key, substitutions)
    }
    let msg = entry.message
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
      subs.forEach((sub, i) => {
        msg = msg.replace(new RegExp(`\\$${i + 1}`, "g"), sub)
      })
    }
    return msg
  }
}
const Theme = ({ children }: PropsWithChildren) => {
  const [settings] = useSettings()

  const theme = useMemo(() => {
    const prefersDarkMode =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : settings.theme === "dark"

    return createTheme({
      palette: {
        mode: prefersDarkMode ? "dark" : "light",
        primary: {
          main: "#79C476"
        }
      }
    })
  }, [settings.theme])

  const getMessage = useMemo(
    () => createGetMessage(settings.language),
    [settings.language]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nContext.Provider value={{ getMessage }}>
        {children}
      </I18nContext.Provider>
    </ThemeProvider>
  )
}

export default Theme
