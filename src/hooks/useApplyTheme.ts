import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';

/**
 * Single owner of the `dark` class on <html>.
 *
 * Applying the theme used to live inside the ThemeToggle button, which meant `/admin` — where no
 * toggle is rendered — never applied the class at all, and the admin layout had to overwrite the
 * visitor's saved preference to compensate. The admin panel is a dark-only surface, so it is
 * forced here by route instead, leaving the stored preference untouched for the public site.
 */
export const useApplyTheme = (): void => {
  const theme = useThemeStore((state) => state.theme);
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isAdminRoute || theme === 'dark');
  }, [theme, isAdminRoute]);
};
