/** Allowed project / user interest categories — keep in sync with mobile `PROJECT_CATEGORIES`. */
export const ALLOWED_PROJECT_CATEGORIES = [
  'Design',
  'Development',
  'Writing',
  'Marketing',
  'Video',
  'Translation',
  'Data',
  'Other',
]

export function sanitizeInterestedCategories(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(ALLOWED_PROJECT_CATEGORIES)
  return [...new Set(raw.map((c) => String(c).trim()).filter((c) => allowed.has(c)))]
}
