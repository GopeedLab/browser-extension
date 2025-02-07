export function getOS(): PlatformOS | undefined {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.indexOf("win") !== -1) {
    return "windows"
  }
  if (ua.indexOf("mac") !== -1) {
    return "mac"
  }
  if (ua.indexOf("linux") !== -1) {
    return "linux"
  }
}

export function getContrlKey(): string {
  return getOS() === "mac" ? "Meta" : "Control"
}
