import React from 'react';
import { useShopStore } from '../../store/shopStore';
import { SectionHeading } from '../ui/SectionHeading';
import { MapPin, Phone, Camera, Clock } from 'lucide-react';
import { SHOP_MAP_QUERY } from '../../constants/defaults';

export const LocationSection: React.FC = () => {
  const shopInfo = useShopStore((state) => state.shopInfo);

  return (
    <section id="location" className="py-20 md:py-32 bg-white dark:bg-[#111] transition-colors relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Nossa Localização" 
          subtitle="Fácil acesso e um ambiente preparado para receber você com o máximo de conforto."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          
          {/* Info Cards */}
          <div className="lg:col-span-1 flex flex-col space-y-6">
            
            {/* Address Card */}
            <div className="bg-brand-cream dark:bg-[#1a1a1a] p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4 hover:border-brand-gold transition-colors duration-300">
              <div className="p-3 bg-white dark:bg-black rounded-full shadow-sm text-brand-gold">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-2">Endereço</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                  {shopInfo.address}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SHOP_MAP_QUERY)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-bold text-brand-gold hover:text-brand-black dark:hover:text-white transition-colors"
                >
                  COMO CHEGAR →
                </a>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-brand-cream dark:bg-[#1a1a1a] p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4 hover:border-brand-gold transition-colors duration-300">
              <div className="p-3 bg-white dark:bg-black rounded-full shadow-sm text-brand-gold">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-2">Contato</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                  {shopInfo.phone}
                </p>
                <a 
                  href={`https://wa.me/${shopInfo.whatsapp}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-bold text-brand-gold hover:text-brand-black dark:hover:text-white transition-colors"
                >
                  CHAME NO WHATSAPP →
                </a>
              </div>
            </div>

            {/* Hours Card */}
            <div className="bg-brand-cream dark:bg-[#1a1a1a] p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-4 hover:border-brand-gold transition-colors duration-300">
              <div className="p-3 bg-white dark:bg-black rounded-full shadow-sm text-brand-gold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-2">Horários</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Segunda a Sábado<br/>
                  <span className="font-bold">{shopInfo.workingHours.start.toString().padStart(2, '0')}:00 - {shopInfo.workingHours.end.toString().padStart(2, '0')}:00</span>
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-2 italic">
                  Domingo fechado
                </p>
              </div>
            </div>
            
          </div>

          {/* Map Embed */}
          <div className="lg:col-span-2 relative w-full h-[400px] lg:h-auto rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 group">
            {/* Overlay to prevent accidental scrolling on map, click to interact */}
            <div className="absolute inset-0 bg-transparent z-10 pointer-events-none group-hover:pointer-events-auto"></div>
            
            <iframe
              src={shopInfo.mapEmbedUrl}
              className="absolute inset-0 w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700"
              title={`Localização do Luan Studio Barber: ${SHOP_MAP_QUERY}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            <div className="absolute bottom-6 right-6 z-20 bg-white dark:bg-black p-4 rounded-xl shadow-xl flex items-center gap-3">
              <a
                href={shopInfo.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand-black dark:text-white hover:text-brand-gold dark:hover:text-brand-gold transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-sm font-bold">{shopInfo.instagramHandle}</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
