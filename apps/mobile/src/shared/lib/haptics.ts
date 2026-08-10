import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

export type HapticImpact = 'light' | 'medium' | 'heavy'
export type HapticNotification = 'success' | 'warning' | 'error'

const impactStyle: Record<HapticImpact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
}

const notificationType: Record<HapticNotification, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
}

/**
 * Haptics wrapper honoring the mobile design (section 8): light impact on save
 * and on type switch, warning on error, and respect for the OS "disable
 * haptics" setting. Web (and bare RN without the native module) are no-ops.
 *
 * Haptics are fire-and-forget; we swallow native rejections so a transient
 * module error can never break the save flow.
 */
export const haptics = {
  impact(style: HapticImpact = 'light'): void {
    if (Platform.OS === 'web') return
    void Haptics.impactAsync(impactStyle[style]).catch(() => {})
  },
  notify(type: HapticNotification): void {
    if (Platform.OS === 'web') return
    void Haptics.notificationAsync(notificationType[type]).catch(() => {})
  },
}
