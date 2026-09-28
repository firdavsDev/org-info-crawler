// Direct address of the FastAPI server as seen from the browser (API_PORT in the root .env).
export const API_ORIGIN = `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || 8000}`
export const SWAGGER_URL = `${API_ORIGIN}/docs`
export const ORGINFO_URL = 'https://orginfo.uz'

export function orginfoSearchUrl(tin) {
  return `${ORGINFO_URL}/uz/search/organizations/?q=${encodeURIComponent(tin)}`
}

export function orginfoFounderUrl(name) {
  return `${ORGINFO_URL}/uz/search/founders/?q=${encodeURIComponent(name)}`
}
