/**
 * JetMeAway design tokens — single source of truth for colours, spacing,
 * typography, radii, shadows, and motion across the native app.
 *
 * Brand-blue is `#0066FF` to stay consistent with the website design system
 * (see CLAUDE.md / src/app/globals.css). Semantic tokens (surface,
 * textPrimary, etc.) layer on top so screens reference intent rather than
 * raw colour values — makes dark-mode + theme-swap trivial later.
 *
 * Typography presumes Poppins is loaded via expo-font (already wired in
 * App.tsx). All scales use 4-pt baseline spacing.
 */

const palette = {
  white: '#FFFFFF',
  black: '#000000',
  navy900: '#0F1119',
  navy800: '#1A1D2B',
  slate700: '#374151',
  slate600: '#5C6378',
  slate500: '#8E95A9',
  slate300: '#CBD5E1',
  // 2026-05-06 — premium-theme darken pass. The earlier values
  // (slate200 #E8ECF4, slate100 #F1F3F7, slate50 #F8FAFC) read
  // sterile white on iOS; users said the app felt cold. Shifted to
  // a deeper navy-tinted grey-blue family so the screen background
  // and dividers carry brand warmth without sacrificing card
  // contrast (cards stay pure white).
  slate200: '#D7DDE9',
  slate100: '#E4E9F2',
  slate50: '#EEF3F9',
  blue900: '#001F66',
  blue700: '#0052CC',
  blue600: '#0066FF',
  blue200: '#BFD7FF',
  blue100: '#EBF3FF',
  blue50: '#F5F9FF',
  red700: '#B91C1C',
  red600: '#D9281B',
  red100: '#FEE2E2',
  amber600: '#D97706',
  amber100: '#FEF3C7',
  green700: '#047857',
  green600: '#059669',
  green100: '#D1FAE5',
};

export const colors = {
  // Surface
  surface: palette.white,
  surfaceAlt: palette.slate50,
  surfaceInverse: palette.navy900,
  surfaceMuted: palette.slate100,

  // Lines / dividers
  border: palette.slate200,
  borderStrong: palette.slate300,

  // Text
  textPrimary: palette.navy800,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textOnBrand: palette.white,
  textInverse: palette.white,

  // Status
  danger: palette.red600,
  dangerStrong: palette.red700,
  dangerSubtle: palette.red100,
  warning: palette.amber600,
  warningSubtle: palette.amber100,
  success: palette.green600,
  successStrong: palette.green700,
  successSubtle: palette.green100,

  // Brand
  brand: palette.blue600,
  brandHover: palette.blue700,
  brandStrong: palette.blue900,
  brandMuted: palette.blue100,
  brandSubtle: palette.blue50,

  // Raw palette accessor for edge cases (charts, gradients, etc.).
  palette,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

/**
 * Typography scale. `fontFamily` values match the variant names already
 * loaded by `useFonts` in App.tsx (Poppins_400Regular through 900Black).
 */
export const typography = {
  display: {
    fontFamily: 'Poppins_900Black',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  caption: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    fontFamily: 'Poppins_900Black',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadows = {
  // Bumped one notch with the premium-darken theme pass so cards still
  // read as elevated against the deeper navy-tinted surfaceAlt.
  sm: {
    shadowColor: '#0066FF',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  md: {
    shadowColor: '#0066FF',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  lg: {
    shadowColor: '#0066FF',
    shadowOpacity: 0.20,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
} as const;

export const motion = {
  spring: {
    damping: 18,
    stiffness: 200,
    mass: 1,
  },
  springSnappy: {
    damping: 22,
    stiffness: 320,
    mass: 0.8,
  },
  durationMs: {
    fast: 150,
    medium: 250,
    slow: 400,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  motion,
} as const;

export type Theme = typeof theme;
