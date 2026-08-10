import { useFonts } from 'expo-font'
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit'

/**
 * Outfit (400/500/600/700) loaded with stable family names so the Text
 * component can map weight -> family. Each weight gets its own family entry;
 * if the font is unavailable (older platform / stripped build) the system font
 * is the natural fallback because we always pass a weight-specific name that RN
 * resolves to the registered file.
 */
const FONT_MAP = {
  Outfit: Outfit_400Regular,
  'Outfit-Medium': Outfit_500Medium,
  'Outfit-SemiBold': Outfit_600SemiBold,
  'Outfit-Bold': Outfit_700Bold,
} as const

export type FontWeight = 400 | 500 | 600 | 700

/** The registered family name for a numeric weight. */
export function familyForWeight(weight: FontWeight): string {
  switch (weight) {
    case 400:
      return 'Outfit'
    case 500:
      return 'Outfit-Medium'
    case 600:
      return 'Outfit-SemiBold'
    case 700:
      return 'Outfit-Bold'
  }
}

/** Load the Outfit weights; returns `[loaded, error]` for a splash gate. */
export function useLoadFonts(): [boolean, Error | null] {
  return useFonts(FONT_MAP)
}
