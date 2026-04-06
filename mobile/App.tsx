import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import TabNavigator from './src/navigation/TabNavigator';
import { JetMeAwayTheme } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('./assets/fonts/Poppins_800ExtraBold.ttf'),
    Poppins_900Black: require('./assets/fonts/Poppins_900Black.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <NavigationContainer theme={JetMeAwayTheme}>
        <StatusBar style="dark" />
        <TabNavigator />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
