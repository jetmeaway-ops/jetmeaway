import { DefaultTheme } from '@react-navigation/native';
import { Colors } from '../constants/colors';

export const JetMeAwayTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.white,
    text: Colors.dark,
    border: Colors.border,
  },
};
