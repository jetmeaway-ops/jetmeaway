import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RootTabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import FlightsScreen from '../screens/FlightsScreen';
import HotelsScreen from '../screens/HotelsScreen';
import PackagesScreen from '../screens/PackagesScreen';
import CarsScreen from '../screens/CarsScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Home: 'home',
  Flights: 'plane',
  Hotels: 'hotel',
  Packages: 'cube',
  Cars: 'car',
  Explore: 'compass',
  More: 'ellipsis-h',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name={TAB_ICONS[route.name]} size={size - 4} color={color} />
        ),
        tabBarActiveTintColor: Colors.activeTab,
        tabBarInactiveTintColor: Colors.inactiveTab,
        tabBarLabelStyle: {
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 10,
          marginTop: -2,
        },
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: Colors.border,
          backgroundColor: Colors.white,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Flights" component={FlightsScreen} />
      <Tab.Screen name="Hotels" component={HotelsScreen} />
      <Tab.Screen name="Packages" component={PackagesScreen} />
      <Tab.Screen name="Cars" component={CarsScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
