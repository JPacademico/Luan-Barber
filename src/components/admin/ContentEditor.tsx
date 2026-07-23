import React, { useState } from 'react';
import { useShopStore } from '../../store/shopStore';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';
import { pushShopContentToBackend } from '../../lib/adminApi';

export const ContentEditor: React.FC = () => {
  const { owner, carouselImages, updateOwner, updateCarouselImage, resetToDefaults, shopInfo, updateShopInfo } = useShopStore();

  const [bioText, setBioText] = useState(owner.bio);
  const [ownerTitle, setOwnerTitle] = useState(owner.title);
  const [clientsServed, setClientsServed] = useState(owner.clientsServed);
  const [heroImages, setHeroImages] = useState([...carouselImages].sort((a,b) => a.order - b.order));
  const [hours, setHours] = useState(shopInfo.workingHours);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updateOwner({ bio: bioText, title: ownerTitle, clientsServed });

      heroImages.forEach((img, idx) => {
        updateCarouselImage(idx, { url: img.url });
      });

      updateShopInfo({ workingHours: hours });

      // Zustand sets are synchronous, so the store now holds the merged content to push.
      const { owner: nextOwner, carouselImages: nextCarousel, shopInfo: nextShopInfo } =
        useShopStore.getState();
      const outcome = await pushShopContentToBackend({
        owner: nextOwner,
        carouselImages: nextCarousel,
        shopInfo: nextShopInfo,
      });

      if (outcome === 'synced' || outcome === 'skipped') {
        toast.success('Conteúdo salvo com sucesso', {
          description:
            outcome === 'synced'
              ? 'As alterações valem para todos os dispositivos.'
              : undefined,
        });
      } else if (outcome === 'unauthorized') {
        // The local save stuck, but the shared copy didn't — flag it, don't claim success.
        toast.error('Salvo apenas neste aparelho — sessão expirada.', {
          description: 'Saia e entre novamente no painel para publicar para todos.',
          duration: 10000,
        });
      } else {
        toast.error('Salvo apenas neste aparelho.', {
          description: 'O servidor não confirmou; os outros dispositivos ainda veem o conteúdo antigo. Tente salvar de novo.',
          duration: 10000,
        });
      }
    } catch (error) {
      toast.error('Erro ao salvar conteúdo');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar todo o conteúdo para os valores padrão de fábrica? Isso não afeta agendamentos.')) {
      resetToDefaults();
      // Need a slight delay to allow store update to propagate to local state, or just reload
      setTimeout(() => window.location.reload(), 500); 
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 sticky top-20 z-40 shadow-lg">
        <h3 className="text-white font-bold">Gerenciar Conteúdo</h3>
        <div className="flex space-x-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white flex items-center space-x-2 transition-colors"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-bold rounded hover:bg-brand-gold/90 flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{isSaving ? 'Salvando…' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Hero Carousel Editor */}
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
        <h4 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">Imagens do Carrossel (Hero)</h4>
        <div className="space-y-4">
          {heroImages.map((img, index) => (
            <div key={img.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <img src={img.url} alt={img.alt} className="w-32 h-20 object-cover rounded bg-black" />
              <div className="flex-grow w-full">
                <label className="block text-xs text-gray-500 mb-1">URL da Imagem {index + 1}</label>
                <input 
                  type="text" 
                  value={img.url}
                  onChange={(e) => {
                    const newImgs = [...heroImages];
                    newImgs[index].url = e.target.value;
                    setHeroImages(newImgs);
                  }}
                  className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owner Bio Editor */}
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
        <h4 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">Perfil: {owner.name}</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Título Profissional</label>
            <input 
              type="text" 
              value={ownerTitle}
              onChange={(e) => setOwnerTitle(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">Biografia</label>
            <textarea 
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              rows={6}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold leading-relaxed"
            />
          </div>

          <div>
            <label htmlFor="clientsServed" className="block text-xs text-gray-500 mb-1">
              Clientes Atendidos (exibido na seção &ldquo;Sobre&rdquo;)
            </label>
            <input
              id="clientsServed"
              type="number"
              min={0}
              value={clientsServed}
              onChange={(e) => setClientsServed(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>
      </div>

      {/* Working Hours Editor */}
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
        <h4 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">Configuração de Horários</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Abertura (Hora)</label>
            <select
              value={hours.start}
              onChange={(e) => setHours({ ...hours, start: parseInt(e.target.value) })}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold"
            >
              {Array.from({length: 12}, (_, i) => i + 6).map(h => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fechamento (Hora)</label>
            <select
              value={hours.end}
              onChange={(e) => setHours({ ...hours, end: parseInt(e.target.value) })}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-gold"
            >
              {Array.from({length: 12}, (_, i) => i + 12).map(h => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">Nota: O sistema gera automaticamente intervalos de 30 minutos entre a abertura e fechamento.</p>
      </div>

    </div>
  );
};
