import deMessages from "~locales/de/messages.json"
import enMessages from "~locales/en/messages.json"
import esMessages from "~locales/es/messages.json"
import frMessages from "~locales/fr/messages.json"
import itMessages from "~locales/it/messages.json"
import jaMessages from "~locales/ja/messages.json"
import koMessages from "~locales/ko/messages.json"
import ptBrMessages from "~locales/pt_BR/messages.json"
import ruMessages from "~locales/ru/messages.json"
import trMessages from "~locales/tr/messages.json"
import ukMessages from "~locales/uk/messages.json"
import zhTwMessages from "~locales/zh_TW/messages.json"
import zhMessages from "~locales/zh/messages.json"

interface MessageEntry {
  message: string
  placeholders?: Record<string, { content: string }>
}

type Messages = Record<string, MessageEntry>

const localeMessages = {
  en: enMessages,
  zh: zhMessages,
  zh_TW: zhTwMessages,
  de: deMessages,
  es: esMessages,
  fr: frMessages,
  it: itMessages,
  ja: jaMessages,
  ko: koMessages,
  pt_BR: ptBrMessages,
  ru: ruMessages,
  tr: trMessages,
  uk: ukMessages
} satisfies Record<string, Messages>

type LocaleCode = keyof typeof localeMessages
export type Language = "auto" | LocaleCode

interface SupportedLanguage {
  code: Language
  name: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "auto", name: "Auto" },
  ...Object.entries(localeMessages).map(([code, messages]) => ({
    code: code as LocaleCode,
    name: messages.language_name.message
  }))
]

function replacePositionalPlaceholders(
  value: string,
  substitutions: string[]
): string {
  return value.replace(/\$([1-9])/g, (_, index: string) => {
    return substitutions[Number(index) - 1] ?? ""
  })
}

function formatMessage(
  entry: MessageEntry,
  substitutions?: string | string[]
): string {
  const values = substitutions
    ? Array.isArray(substitutions)
      ? substitutions
      : [substitutions]
    : []
  let message = entry.message

  for (const [name, placeholder] of Object.entries(entry.placeholders ?? {})) {
    const content = replacePositionalPlaceholders(placeholder.content, values)
    message = message.replace(new RegExp(`\\$${name}\\$`, "gi"), content)
  }

  return replacePositionalPlaceholders(message, values).replace(/\$\$/g, "$")
}

export function getMessage(
  language: Language,
  key: string,
  substitutions?: string | string[]
): string {
  if (language === "auto") {
    return chrome.i18n.getMessage(key, substitutions)
  }

  const messages = localeMessages[language] ?? localeMessages.en
  const entry = messages[key] ?? localeMessages.en[key]
  return entry ? formatMessage(entry, substitutions) : key
}
