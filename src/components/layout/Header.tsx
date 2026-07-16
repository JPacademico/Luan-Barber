import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { HeaderInstallButton } from '../pwa/HeaderInstallButton';

interface NavLink {
  label: string;
  path: string;
  /** Section to scroll to once `path` is rendered. Omit to land at the top of the page. */
  sectionId?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Início', path: '/', sectionId: 'hero' },
  { label: 'Serviços', path: '/booking', sectionId: 'services' },
  { label: 'Promoções', path: '/', sectionId: 'specials' },
  { label: 'Sobre', path: '/', sectionId: 'about' },
  { label: 'Localização', path: '/', sectionId: 'location' },
];

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cross-page anchors arrive as a hash; the target only exists after the new route paints.
  useEffect(() => {
    if (!location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    element?.scrollIntoView({ behavior: 'smooth' });
  }, [location]);

  const handleNavigate = useCallback(
    ({ path, sectionId }: NavLink) => {
      setIsMobileMenuOpen(false);

      if (location.pathname === path) {
        if (!sectionId) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      navigate({ pathname: path, hash: sectionId ? `#${sectionId}` : '' });
    },
    [location.pathname, navigate]
  );

  /**
   * Until the header gains its own background it floats over a dark surface — the hero image on
   * Home, the black page header elsewhere. Theme-coloured text would be near-black on black in
   * the light theme, so the transparent state is always styled for a dark backdrop.
   */
  const isOverDarkSurface = !isScrolled && !isMobileMenuOpen;

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? 'bg-white/90 dark:bg-brand-black/90 backdrop-blur-md shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex flex-col items-center group">
          <span
            className={`font-display font-bold text-2xl md:text-3xl tracking-widest leading-none transition-colors ${
              isOverDarkSurface ? 'text-white' : 'text-brand-black dark:text-white'
            }`}
          >
            LUAN
          </span>
          <span className="font-body text-xs md:text-sm text-brand-gold tracking-[0.3em] font-medium mt-1">
            STUDIO BARBER
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavigate(link)}
              className={`text-sm font-medium hover:text-brand-gold transition-colors ${
                isOverDarkSurface ? 'text-gray-100' : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {link.label}
            </button>
          ))}
          <Link to="/booking" className="btn-primary py-2 px-5 text-sm">
            Agendar
          </Link>
          <HeaderInstallButton onDarkSurface={isOverDarkSurface} />
          <ThemeToggle onDarkSurface={isOverDarkSurface} />
        </nav>

        <div className="flex items-center md:hidden space-x-4">
          <HeaderInstallButton onDarkSurface={isOverDarkSurface} />
          <ThemeToggle onDarkSurface={isOverDarkSurface} />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className={`focus:outline-none transition-colors ${
              isOverDarkSurface ? 'text-white' : 'text-brand-black dark:text-white'
            }`}
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white dark:bg-brand-black shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-96 border-t border-gray-100 dark:border-gray-800' : 'max-h-0'
        }`}
      >
        <div className="px-4 py-6 flex flex-col space-y-4">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavigate(link)}
              className="text-left text-lg font-medium text-gray-800 dark:text-gray-200 hover:text-brand-gold pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/booking"
            onClick={() => setIsMobileMenuOpen(false)}
            className="btn-primary w-full mt-4"
          >
            Agendar Horário
          </Link>
        </div>
      </div>
    </header>
  );
};
