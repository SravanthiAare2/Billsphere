import { colors } from '../tokens/colors';

export const lightTheme = {
  name: 'light',
  colors: {
    background: colors.deepNavy[50],
    surface: '#ffffff',
    text: colors.slate[900],
    muted: colors.slate[500],
    primary: colors.primary[600],
    accent: colors.deepNavy[600],
    success: colors.success[500],
    warning: colors.warning[500],
    danger: colors.danger[500],
  },
};

export const darkTheme = {
  name: 'dark',
  colors: {
    background: '#020617',
    surface: '#0f172a',
    text: '#f8fafc',
    muted: '#94a3b8',
    primary: colors.primary[400],
    accent: colors.deepNavy[400],
    success: colors.success[400],
    warning: colors.warning[400],
    danger: colors.danger[400],
  },
};
