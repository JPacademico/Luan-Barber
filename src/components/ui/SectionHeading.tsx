import React from 'react';

/**
 * Which surface the heading sits on.
 *
 * `auto` follows the active theme and suits sections that flip with it.
 * `onDark` is for bands that stay dark in both themes (e.g. the specials strip) — without it
 * the light theme would paint a near-black title onto a near-black background.
 */
type SurfaceTone = 'auto' | 'onDark';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  alignment?: 'left' | 'center' | 'right';
  tone?: SurfaceTone;
  className?: string;
}

const TITLE_TONE: Record<SurfaceTone, string> = {
  auto: 'text-brand-black dark:text-brand-cream',
  onDark: 'text-brand-cream',
};

const SUBTITLE_TONE: Record<SurfaceTone, string> = {
  auto: 'text-gray-600 dark:text-gray-400',
  onDark: 'text-gray-400',
};

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  alignment = 'center',
  tone = 'auto',
  className = '',
}) => {
  const alignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[alignment];

  return (
    <div className={`flex flex-col ${alignClass} mb-12 ${className}`}>
      <h2
        className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold ${TITLE_TONE[tone]} tracking-tight mb-4`}
      >
        {title}
      </h2>

      {/* Decorative Gold Line */}
      <div className="w-24 h-1 bg-brand-gold rounded-full mb-6" />

      {subtitle && <p className={`${SUBTITLE_TONE[tone]} max-w-2xl text-lg`}>{subtitle}</p>}
    </div>
  );
};
