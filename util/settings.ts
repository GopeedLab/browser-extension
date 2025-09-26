import { defaultSettings, type Settings } from "~options/types"

/**
 * Deep merge objects, automatically handle nested objects
 * @param target Target object (default settings)
 * @param source Source object (stored settings)
 * @returns Merged object
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (sourceValue === null || sourceValue === undefined) {
        // Skip null or undefined values, use default values
        continue
      }

      if (
        typeof sourceValue === 'object' &&
        typeof targetValue === 'object' &&
        !Array.isArray(sourceValue) &&
        !Array.isArray(targetValue)
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(targetValue, sourceValue)
      } else {
        // Directly override primitive types and arrays
        result[key] = sourceValue
      }
    }
  }

  return result
}

/**
 * Merge settings object, ensure new settings use default values
 * @param stored Settings stored in storage
 * @param defaults Default settings
 * @returns Merged settings
 */
export function mergeSettings(stored: Partial<Settings>, defaults: Settings): Settings {
  if (!stored || typeof stored !== 'object') {
    return { ...defaults }
  }

  return deepMerge(defaults, stored)
}

/**
 * Get merged settings, used internally by useSettings hook
 * @param storedSettings Raw settings from storage
 * @returns Merged settings with default values
 */
export function getMergedSettings(storedSettings: Partial<Settings> | null): Settings {
  if (!storedSettings) {
    return { ...defaultSettings }
  }
  return mergeSettings(storedSettings, defaultSettings)
}