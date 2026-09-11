import React from 'react';
import { Brush, Check, Droplets, Eye, Plus, Scissors, Smile } from 'lucide-react';
import { useShopStore } from '../../store/shopStore';
import { SectionHeading } from '../ui/SectionHeading';

interface Plan {
  id: string;
  name: string;
  /** Headline figure on the card — how many services the month includes. */
  servicesPerMonth: number;
  priceMonthly: number;
  perks: string[];
  /** Renders the stronger gold treatment, as on the shop's own flyer. */
  isFeatured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    servicesPerMonth: 4,
    priceMonthly: 160,
    perks: [
      '1 serviço por semana',
      'Agendamento com prioridade',
      'Economia e praticidade',
      'Seu estilo sempre em dia',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    servicesPerMonth: 6,
    priceMonthly: 240,
    perks: [
      'Até 1–2 serviços por semana',
      'Agendamento com prioridade',
      'Melhor custo-benefício',
      'Seu estilo sempre em dia',
    ],
    isFeatured: true,
  },
];

const INCLUDED_SERVICES = [
  { label: 'Corte', icon: <Scissors size={20} /> },
  { label: 'Barba', icon: <Smile size={20} /> },
  { label: 'Limpeza de pele', icon: <Droplets size={20} /> },
  { label: 'Sobrancelha', icon: <Eye size={20} /> },
  { label: 'Pigmentação', icon: <Brush size={20} /> },
  { label: 'E muito mais', icon: <Plus size={20} /> },
];

/** "R$ 160" for the round numbers the plans actually use, with cents only if one ever needs them. */
const formatPrice = (value: number): string =>
  Number.isInteger(value) ? `R$ ${value}` : `R$ ${value.toFixed(2).replace('.', ',')}`;

/**
 * Plans are sold by conversation, not checked out on the site — the button hands the client to
 * WhatsApp with the chosen plan already written out, so the owner knows what is being asked about
 * before replying.
 */
const buildPlanWhatsAppUrl = (whatsappNumber: string, plan: Plan): string => {
  const message =
    `Olá! Tenho interesse no *Plano ${plan.name}* ` +
    `(${plan.servicesPerMonth} serviços no mês — ${formatPrice(plan.priceMonthly)}). ` +
    `Pode me explicar como funciona?`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

export const PackagesSection: React.FC = () => {
  const shopInfo = useShopStore((state) => state.shopInfo);

  return (
    <section
      id="packages"
      className="py-20 md:py-28 bg-white dark:bg-[#111] transition-colors scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Pacotes Mensais"
          subtitle="Estilo, praticidade e economia. Garanta seu pacote e mantenha seu estilo sempre em dia."
        />

        {/*
          The cards stay dark in both themes, like the shop's printed flyer: the plan is the
          premium offer on the page and should read the same way on paper and on screen.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-2xl overflow-hidden bg-brand-black shadow-xl flex flex-col ${
                plan.isFeatured
                  ? 'border-2 border-brand-gold md:-translate-y-2'
                  : 'border border-brand-gold/30'
              }`}
            >
              <header
                className={`px-6 py-5 text-center ${
                  plan.isFeatured
                    ? 'bg-gradient-to-r from-brand-gold/80 via-brand-gold to-brand-gold/80'
                    : 'bg-gradient-to-r from-brand-gold/40 via-brand-gold/60 to-brand-gold/40'
                }`}
              >
                <span className="block text-[0.65rem] uppercase tracking-[0.3em] text-brand-black/70">
                  Plano
                </span>
                <span className="block font-display font-bold text-2xl md:text-3xl text-brand-black tracking-wide">
                  {plan.name}
                </span>
              </header>

              <div className="p-6 sm:p-8 flex flex-col flex-grow text-center">
                <p className="flex items-center justify-center gap-3">
                  <span className="font-display font-bold text-5xl text-brand-gold leading-none">
                    {plan.servicesPerMonth}
                  </span>
                  <span className="text-left text-sm uppercase tracking-wider text-gray-300 leading-tight">
                    Serviços
                    <br />
                    no mês
                  </span>
                </p>

                <div className="h-px bg-brand-gold/20 my-6" />

                <p className="font-display font-bold text-4xl md:text-5xl text-white">
                  {formatPrice(plan.priceMonthly)}
                </p>

                <ul className="mt-8 space-y-3 text-left flex-grow">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>

                <a
                  href={buildPlanWhatsAppUrl(shopInfo.whatsapp, plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${
                    plan.isFeatured ? 'btn-primary' : 'btn-secondary'
                  } w-full mt-8 py-4 font-bold uppercase tracking-wider`}
                >
                  Quero este plano
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-8">
            Serviços inclusos
          </p>

          <ul className="grid grid-cols-3 sm:grid-cols-6 gap-y-8 gap-x-4">
            {INCLUDED_SERVICES.map(({ label, icon }) => (
              <li key={label} className="flex flex-col items-center text-center gap-3">
                <span className="w-12 h-12 rounded-full border border-brand-gold/40 text-brand-gold flex items-center justify-center">
                  {icon}
                </span>
                <span className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 leading-tight">
                  {label}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-12 text-center">
            <span className="inline-block px-6 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium">
              Vagas limitadas
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};
