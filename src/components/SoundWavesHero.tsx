'use client';

/**
 * Hero visual inspirado en React Bits (reactbits.dev): ondas de sonido animadas.
 * Impacto visual y temática música/voces para VoxStudio.
 */
const BARS = 28;
const barHeights = Array.from({ length: BARS }, (_, i) => 24 + Math.sin(i * 0.7) * 40 + (i % 4) * 12);

export default function SoundWavesHero({ compact }: { compact?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#29B6B6]/8 via-transparent to-[#6B2D8C]/8" />
      <div
        className={`absolute left-0 right-0 flex items-end justify-center gap-0.5 px-4 ${compact ? 'bottom-0 h-20' : 'bottom-0 h-36'}`}
      >
        {barHeights.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-full min-h-[6px] bg-gradient-to-t from-[#29B6B6] to-[#6B2D8C] opacity-75 animate-sound-bar"
            style={{
              height: `${compact ? h * 0.6 : h}px`,
              animationDelay: `${i * 0.04}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
