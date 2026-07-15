import React from 'react';
import { useShopStore } from '../../store/shopStore';
import { MapPin, Phone, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const shopInfo = useShopStore((state) => state.shopInfo);
  const owner = useShopStore((state) => state.owner);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-black text-brand-cream py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          
          {/* Brand Col */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <Link to="/" className="flex flex-col items-center md:items-start group">
              <span className="font-display font-bold text-3xl text-white tracking-widest leading-none">LUAN</span>
              <span className="font-body text-sm text-brand-gold tracking-[0.3em] font-medium mt-1">STUDIO BARBER</span>
            </Link>
            <p className="text-gray-400 mt-4 max-w-xs text-sm">
              Experiência, estilo e atendimento que fazem a diferença. Desde {owner.since}.
            </p>
          </div>

          {/* Contact Col */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h4 className="font-display font-bold text-xl text-white mb-2">Contato</h4>
            <div className="flex items-start space-x-3 text-gray-300">
              <MapPin className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
              <span className="text-sm">{shopInfo.address}</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Phone className="w-5 h-5 text-brand-gold shrink-0" />
              <span className="text-sm">{shopInfo.phone}</span>
            </div>
            <a
              href={shopInfo.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${shopInfo.instagramHandle}`}
              className="flex items-center gap-2 text-gray-400 hover:text-brand-gold transition-colors"
            >
              <span className="p-2 bg-gray-800 rounded-full">
                <Camera size={20} />
              </span>
              <span className="text-sm">{shopInfo.instagramHandle}</span>
            </a>
          </div>

          {/* Hours Col */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h4 className="font-display font-bold text-xl text-white mb-2">Horário de Funcionamento</h4>
            <p className="text-sm text-gray-300">
              Segunda a Sábado<br/>
              {shopInfo.workingHours.start.toString().padStart(2, '0')}:00 às {shopInfo.workingHours.end.toString().padStart(2, '0')}:00
            </p>
            <p className="text-sm text-brand-gold mt-2">
              Domingo - Fechado
            </p>
            
            <Link to="/booking" className="text-sm font-bold text-brand-gold hover:text-white transition-colors mt-4 inline-block">
              Ver serviços e agendar →
            </Link>

            <Link to="/admin" className="text-xs text-gray-600 hover:text-gray-400 transition-colors mt-8 inline-block">
              Acesso Administrativo
            </Link>
          </div>
          
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>&copy; {currentYear} Luan Studio Barber. Todos os direitos reservados.</p>
          <p className="mt-2 md:mt-0">Feito com estilo e dedicação.</p>
        </div>
      </div>
      
      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${shopInfo.whatsapp}?text=Olá! Gostaria de agendar um horário.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-[#25D366]/50"
        aria-label="Agendar via WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </footer>
  );
};
