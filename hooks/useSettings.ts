import { useStorage } from "@plasmohq/storage/hook"

import { STORAGE_SETTINGS } from "~constants"
import { defaultSettings, type Settings } from "~options/types"
import { getMergedSettings } from "~util/settings"

/**
 * Custom hook for managing settings with automatic merging of default values
 * @returns [mergedSettings, setStoredSettings] tuple
 */
export function useSettings() {
  const [storedSettings, setStoredSettings] = useStorage<Settings>(
    STORAGE_SETTINGS,
    defaultSettings
  )
  
  // Use merged settings to ensure new fields have default values
  const settings = getMergedSettings(storedSettings)
  
  return [settings, setStoredSettings] as const
}