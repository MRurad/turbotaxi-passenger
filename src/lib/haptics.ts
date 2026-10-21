import * as Haptics from 'expo-haptics';

export type HapticKind =
  'none' | 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error';

/** Fire-and-forget haptic feedback; never throws (unsupported devices just no-op). */
export function triggerHaptic(kind: HapticKind): void {
  let promise: Promise<void> | undefined;
  switch (kind) {
    case 'none':
      return;
    case 'light':
      promise = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      promise = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'selection':
      promise = Haptics.selectionAsync();
      break;
    case 'success':
      promise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      promise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      promise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
  promise?.catch(() => undefined);
}
