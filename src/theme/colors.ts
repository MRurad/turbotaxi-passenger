import { palette } from './palette';

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  /** Filled backgrounds behind textOnPrimary (buttons, filled icons). */
  primaryFill: string;
  /** Fill for small text on primary (selected chips, sm buttons) — AA at 13px. */
  primaryFillStrong: string;
  /** Small accent text on primarySoft (badges). */
  primaryText: string;
  pressedOverlay: string;
  success: string;
  successText: string;
  successSoft: string;
  warning: string;
  warningText: string;
  warningSoft: string;
  danger: string;
  dangerText: string;
  dangerPressed: string;
  dangerSoft: string;
  overlay: string;
  mapRoute: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
  transparent: string;
}

export type ColorToken = keyof ColorTokens;

export const lightColors: ColorTokens = {
  background: palette.neutral[0],
  surface: palette.neutral[50],
  surfaceElevated: palette.neutral[0],
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],
  textPrimary: palette.neutral[900],
  textSecondary: palette.neutral[600],
  textMuted: palette.neutral[500],
  textOnPrimary: palette.neutral[0],
  primary: palette.steel[500],
  primaryPressed: palette.steel[600],
  primarySoft: palette.steel[50],
  primaryFill: palette.steel[500],
  primaryFillStrong: palette.steel[600],
  primaryText: palette.steel[700],
  pressedOverlay: palette.neutral[100],
  success: palette.status.success,
  successText: palette.status.successStrong,
  successSoft: palette.status.successSoftLight,
  warning: palette.status.warning,
  warningText: palette.status.warningStrong,
  warningSoft: palette.status.warningSoftLight,
  danger: palette.status.danger,
  dangerText: palette.status.dangerStrong,
  dangerPressed: palette.status.dangerStrong,
  dangerSoft: palette.status.dangerSoftLight,
  overlay: palette.overlayLight,
  mapRoute: palette.steel[500],
  skeleton: palette.neutral[100],
  skeletonHighlight: palette.neutral[50],
  shadow: palette.shadow,
  transparent: palette.transparent,
};

export const darkColors: ColorTokens = {
  background: palette.neutral[900],
  surface: palette.navy.surface,
  surfaceElevated: palette.navy.elevated,
  border: palette.navy.border,
  borderStrong: palette.neutral[700],
  textPrimary: palette.neutral[50],
  textSecondary: palette.neutral[300],
  textMuted: palette.neutral[400],
  textOnPrimary: palette.neutral[0],
  primary: palette.steel[400],
  primaryPressed: palette.steel[700],
  primarySoft: palette.primarySoftDark,
  primaryFill: palette.steel[600],
  primaryFillStrong: palette.steel[600],
  primaryText: palette.steel[300],
  pressedOverlay: palette.navy.elevated,
  success: palette.status.success,
  successText: palette.status.success,
  successSoft: palette.status.successSoftDark,
  warning: palette.status.warning,
  warningText: palette.status.warning,
  warningSoft: palette.status.warningSoftDark,
  danger: palette.status.danger,
  dangerText: palette.status.danger,
  dangerPressed: palette.status.dangerStrong,
  dangerSoft: palette.status.dangerSoftDark,
  overlay: palette.overlayDark,
  mapRoute: palette.steel[300],
  // Lighter than surfaceElevated (the sheet) so skeletons stay visible on it.
  skeleton: palette.navy.border,
  skeletonHighlight: palette.neutral[700],
  shadow: palette.shadow,
  transparent: palette.transparent,
};
