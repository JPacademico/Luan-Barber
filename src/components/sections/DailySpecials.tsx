import React from 'react';
import { useShopStore } from '../../store/shopStore';
import { SectionHeading } from '../ui/SectionHeading';
import { CalendarDays, Target, Users, Scissors, Star, Rocket } from 'lucide-react';

export const DailySpecials: React.FC = () => {
  const specials = useShopStore((state) => state.specials);
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Map icons based on the day abbreviation from the marketing card
  const getIconForSpecial = (abbr: string) => {
    switch (abbr) {
      case 'SEG': return <Target className="w-8 h-8" />;
      case 'TER': return <Users className="w-8 h-8" />;
      case 'QUA': return <Scissors className="w-8 h-8" />; // Using scissors as generic since we don't have a beard icon
      case 'QUI': return <Star className="w-8 h-8" />;
      case 'SEX': return <Rocket className="w-8 h-8" />;
      case 'SÁB': return <CalendarDays className="w-8 h-8" />;
      default: return <Star className="w-8 h-8" />;
    }
  };

  return (
    <section id="specials" className="py-20 md:py-32 bg-[#141414] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
          {/* This band stays dark in both themes, so the heading must not follow the theme. */}
          <SectionHeading
            title="Promoções da Semana"
            subtitle="Cada dia um motivo para se cuidar. Aproveite o incentivo do dia!"
            alignment="left"
            tone="onDark"
            className="mb-0"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specials.map((special) => {
            const isToday = special.dayOfWeek === today;
            
            return (
              <div 
                key={special.id}
                className={`p-6 rounded-xl border flex gap-4 transition-all duration-300 ${
                  isToday 
                    ? 'bg-brand-gray border-brand-gold shadow-[0_0_15px_rgba(201,169,110,0.3)] transform -translate-y-1' 
                    : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Left side: Day Abbreviation + Icon */}
                <div className={`flex flex-col items-center justify-start pt-1 min-w-[70px] ${isToday ? 'text-brand-gold' : 'text-gray-400'}`}>
                  <span className="font-display font-bold text-2xl mb-1">{special.abbreviation}</span>
                  <span className="text-[10px] uppercase tracking-wider mb-4 text-gray-500">{special.fullDay}</span>
                  {getIconForSpecial(special.abbreviation)}
                </div>
                
                {/* Right side: Content */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-bold text-lg ${isToday ? 'text-brand-gold' : 'text-gray-200'}`}>
                      {special.title}
                    </h4>
                    {isToday && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-brand-gold text-brand-black rounded-full animate-pulse">
                        HOJE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {special.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
