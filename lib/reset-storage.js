// Last-resort recovery for the error pages: clears everything the launcher saved in this browser
// (accounts, library, downloads), in case corrupted data keeps a page from rendering.
export function clearSavedData() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('ultimate-launcher:'))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage unavailable: nothing to clear
  }
  window.location.assign('/')
}
