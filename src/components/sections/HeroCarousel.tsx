import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShopStore } from '../../store/shopStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const HeroCarousel: React.FC = () => {
  const carouselImages = useShopStore((state) => state.carouselImages);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sortedImages = useMemo(
    () => [...carouselImages].sort((a, b) => a.order - b.order),
    [carouselImages]
  );

  useEffect(() => {
    if (sortedImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [sortedImages.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  if (sortedImages.length === 0) return null;

  return (
    // svh instead of vh: on mobile, 100vh is the *expanded* viewport, so the hero overflows
    // behind the browser chrome and the page jiggles as the toolbar hides on scroll.
    <section
      id="hero"
      className="relative w-full h-[100svh] min-h-[600px] overflow-hidden bg-brand-black"
    >
      {/* Carousel Images */}
      {sortedImages.map((image, index) => {
        const isFirst = index === 0;

        return (
          <div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-brand-black/90 z-10" />
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover object-center"
              /* The first slide is the LCP element; the rest are off-screen until they rotate in. */
              loading={isFirst ? 'eager' : 'lazy'}
              fetchPriority={isFirst ? 'high' : 'low'}
              decoding="async"
              draggable={false}
            />
          </div>
        );
      })}

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center md:items-start md:text-left pt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-tight animate-slide-up max-w-3xl">
          Experiência, <span className="text-brand-gold italic">Estilo</span> e Atendimento que Fazem a Diferença
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Um novo visual muda sua postura, sua confiança e os seus resultados.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {/* The checkout and the price catalogue both live on /booking now. */}
          <Link to="/booking" className="btn-primary text-lg px-8 py-4 pulse-ring">
            Agendar Horário
          </Link>
          <Link
            to={{ pathname: '/booking', hash: '#services' }}
            className="btn-secondary text-lg px-8 py-4 bg-transparent text-white border-white hover:bg-white hover:text-brand-black"
          >
            Ver Serviços
          </Link>
        </div>
      </div>

      {/* Carousel Controls */}
      {sortedImages.length > 1 && (
        <div className="absolute bottom-10 left-0 right-0 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-end pointer-events-none">
          <div className="flex space-x-3 pointer-events-auto">
            {sortedImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-10 bg-brand-gold' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Ir para a imagem ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="hidden md:flex space-x-4 pointer-events-auto">
            <button 
              onClick={goToPrev}
              className="p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-brand-black transition-colors backdrop-blur-sm"
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={goToNext}
              className="p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-brand-black transition-colors backdrop-blur-sm"
              aria-label="Próxima imagem"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
