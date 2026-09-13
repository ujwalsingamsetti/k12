import { useTheme as useThemeContext } from '../context/ThemeContext';

/**
 * Reusable theme hook (dark/light mode)
 */
export function useTheme() {
  return useThemeContext();
}

export default useTheme;
