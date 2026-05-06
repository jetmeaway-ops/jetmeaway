/**
 * Tab layout — 4 native bottom tabs (Discover · Search · Trips · Profile).
 *
 * Visuals:
 *   - Active tint: brand blue (#0066FF)
 *   - Inactive tint: text-muted slate
 *   - Background: translucent white surface (96% alpha) for an iOS-blur
 *     feel without the expo-blur dependency. Swap to BlurView later if
 *     we want true vibrancy — see `tabBarBackground` prop.
 *   - Labels: Poppins SemiBold caption (matches typography.caption with
 *     a slightly tighter weight)
 *
 * Hiding the bar on push detail screens:
 *   Use `unstable_settings` per-screen, e.g. inside
 *   `flights/checkout/[ref].tsx`:
 *
 *     export const unstable_settings = {
 *       tabBarStyle: { display: 'none' },
 *     };
 *
 *   Or wrap the relevant push screen with
 *   `useNavigation().getParent()?.setOptions({ tabBarStyle: { display: 'none' }})`
 *   in a useFocusEffect.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { colors, spacing } from '../../src/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<
  'discover' | 'search' | 'trips' | 'profile',
  { active: IconName; inactive: IconName; label: string }
> = {
  discover: { active: 'compass', inactive: 'compass-outline', label: 'Discover' },
  search:   { active: 'search', inactive: 'search-outline', label: 'Search' },
  trips:    { active: 'airplane', inactive: 'airplane-outline', label: 'Trips' },
  profile:  { active: 'person-circle', inactive: 'person-circle-outline', label: 'Profile' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        // Hairline border for visual separation against light content
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: TAB_ICONS.discover.label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.discover.active : TAB_ICONS.discover.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: TAB_ICONS.search.label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.search.active : TAB_ICONS.search.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: TAB_ICONS.trips.label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.trips.active : TAB_ICONS.trips.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: TAB_ICONS.profile.label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.profile.active : TAB_ICONS.profile.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // Translucent surface; swap with BlurView for true vibrancy later.
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.96)' : colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 6,
  },
  tabItem: {
    paddingTop: spacing.xxs,
  },
  tabLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: -2,
  },
});
