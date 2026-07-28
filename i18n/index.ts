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
import zhMessages from "~locales/zh/messages.json"

export const SUPPORTED_LANGUAGES = [
  { code: "auto", nativeName: "Auto" },
  { code: "en", nativeName: "English" },
  { code: "de", nativeName: "Deutsch" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "it", nativeName: "Italiano" },
  { code: "ja", nativeName: "日本語" },
  { code: "ko", nativeName: "한국어" },
  { code: "pt_BR", nativeName: "Português (Brasil)" },
  { code: "ru", nativeName: "Русский" },
  { code: "tr", nativeName: "Türkçe" },
  { code: "uk", nativeName: "Українська" },
  { code: "zh", nativeName: "中文" }
] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]["code"]

interface MessageEntry {
  message: string
  placeholders?: Record<string, { content: string }>
}

type Messages = Record<string, MessageEntry>

const localeMessages: Record<Exclude<Language, "auto">, Messages> = {
  de: deMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  it: itMessages,
  ja: jaMessages,
  ko: koMessages,
  pt_BR: ptBrMessages,
  ru: ruMessages,
  tr: trMessages,
  uk: ukMessages,
  zh: zhMessages
}

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
