import React from 'react';
import { useShopStore } from '../../store/shopStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Award, Star } from 'lucide-react';

export const OwnerSection: React.FC = () => {
  const owner = useShopStore((state) => state.owner);

  return (
    <section id="about" className="py-20 md:py-32 bg-brand-cream dark:bg-brand-black transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image & Certificates */}
          <div className="lg:col-span-5 flex flex-col space-y-8">
            {/* Owner Portrait */}
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-brand-gold mix-blend-multiply opacity-20 group-hover:opacity-0 transition-opacity duration-500 z-10"></div>
              <img 
                src={owner.imageUrl} 
                alt={owner.name} 
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              {/* Decorative Frame */}
              <div className="absolute inset-4 border border-brand-gold/50 rounded-xl z-20 pointer-events-none"></div>
            </div>

            {/* Certificates Grid */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-gold" />
                Certificações
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {owner.certificates.map((cert) => (
                  <div key={cert.id} className="relative group overflow-hidden rounded-lg aspect-video shadow-md">
                    <img 
                      src={cert.imageUrl} 
                      alt={cert.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-white text-xs font-bold">{cert.title}</span>
                      <span className="text-brand-gold text-[10px]">{cert.year}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Bio */}
          <div className="lg:col-span-7 lg:pl-10">
            <SectionHeading 
              title={`Conheça o ${owner.name}`} 
              alignment="left"
              className="mb-8"
            />
            
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-5 h-5 text-brand-gold fill-brand-gold" />
              <h3 className="text-xl font-display font-medium text-brand-gold tracking-wide uppercase">
                {owner.title}
              </h3>
            </div>
            
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              {owner.bio.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Stats/Highlights */}
            <div className="grid grid-cols-2 gap-6 mt-12 pt-10 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="block text-4xl font-display font-bold text-brand-black dark:text-white mb-1">
                  {new Date().getFullYear() - owner.since}+
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                  Anos de Experiência
                </span>
              </div>
              <div>
                <span className="block text-4xl font-display font-bold text-brand-black dark:text-white mb-1">
                  {owner.clientsServed}+
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                  Clientes Atendidos
                </span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};
