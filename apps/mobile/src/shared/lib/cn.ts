import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind-aware className combiner (the shadcn / react-native-reusables
 * convention). `clsx` handles conditional + array inputs; `twMerge` resolves
 * conflicting Tailwind utilities (last wins) so component variants compose
 * cleanly with caller overrides.
 *
 * Used by the react-native-reusables-backed primitives in `shared/ui`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
