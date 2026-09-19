import type { CaptionFont } from '../types/editor'

export const captionFontFamilies: Record<CaptionFont, string> = {
  impact: 'Impact, Arial Black, sans-serif',
  arial: 'Arial Black, Arial, sans-serif',
  comic: 'Comic Sans MS, Trebuchet MS, sans-serif',
  sans: 'Inter, Arial, sans-serif',
}

export function captionFontFamily(font: CaptionFont): string {
  return captionFontFamilies[font]
}
