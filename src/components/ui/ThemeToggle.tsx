import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  /** True while the header floats over a dark hero, where themed colours would vanish. */
  onDarkSurface?: boolean;
}

// Applying the theme to <html> is owned by useApplyTheme; this is just the control.
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onDarkSurface = false }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold ${
        onDarkSurface
          ? 'text-white hover:bg-white/10'
          : 'text-brand-black dark:text-brand-cream hover:bg-gray-200 dark:hover:bg-brand-gray'
      }`}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-brand-gold" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};
