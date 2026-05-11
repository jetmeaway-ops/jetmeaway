// 2026-05-10 dark-theme pass — `background` flipped from #F8FAFC to navy900
// #0F1119 so the WebView shell (App.tsx) and MyTripsModal flow with the
// splash colour #0A1230 from app.json instead of flashing white. The OLD
// values are kept as a comment trail so rollback is one-line.
//   OLD: background: '#F8FAFC',     border: '#E2E8F0',
//   NEW: background: '#0F1119',     border: '#2A2F3F'
// `Colors.white` is unchanged — it's used for explicit card backgrounds in
// dead-but-not-yet-deleted screens; flipping it would break those.
export const Colors = {
  primary: '#0066FF',
  dark: '#1A1D2B',
  body: '#5C6378',
  secondary: '#8E95A9',
  background: '#0F1119',
  white: '#FFFFFF',
  footerDark: '#0F1119',
  border: '#2A2F3F',
  orange: '#FF6B00',
  green: '#16A34A',
  red: '#DC2626',
  activeTab: '#0066FF',
  inactiveTab: '#8E95A9',
  // Matches mobile/app.json splash backgroundColor — used by HomeScreen so
  // the splash flows seamlessly into the home tab with no white flash.
  navy: '#0A1230',
  // Light text on navy — ~4.6:1 contrast vs #0A1230, enough for body copy.
  navySubtext: '#A8B0C8',
};
