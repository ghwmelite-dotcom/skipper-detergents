import { motion, useReducedMotion } from 'framer-motion';

/**
 * EditorialChrome — the decorative, magazine-like ornaments that frame the
 * hero: inset trim lines, editorial tick marks, a rotated volume stamp,
 * and a slowly rotating compass/burst element.
 *
 * None of these are interactive. All are aria-hidden. They add texture +
 * confidence — they're the bit that makes the hero feel *curated* rather
 * than templated.
 */

export function EditorialChrome() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] hidden md:block"
      aria-hidden="true"
    >
      {/* Inset trim box (1px navy line, 16px from edges) */}
      <motion.div
        className="absolute border border-brand-navy/15"
        style={{ top: 16, bottom: 16, left: 16, right: 16 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 2.6 }}
      />

      {/* Top-left editorial rule — tick marks every 20px for ~200px */}
      <motion.svg
        className="absolute left-16 top-7 w-[240px] h-[10px]"
        viewBox="0 0 240 10"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 2.65 }}
      >
        <line
          x1="0"
          y1="5"
          x2="240"
          y2="5"
          stroke="#0B2545"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={i}
            x1={i * 20}
            y1={i % 5 === 0 ? 0 : 2}
            x2={i * 20}
            y2={i % 5 === 0 ? 10 : 8}
            stroke="#0B2545"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        ))}
      </motion.svg>

      {/* Top-right: compass/burst SVG, slowly rotating */}
      <motion.div
        className="absolute right-10 top-10 w-[68px] h-[68px]"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 2.7 }}
      >
        <motion.div
          className="h-full w-full"
          {...(reduced
            ? {}
            : {
                animate: { rotate: 360 },
                transition: {
                  duration: 40,
                  ease: 'linear' as const,
                  repeat: Infinity,
                },
              })}
        >
          <svg viewBox="0 0 68 68" className="h-full w-full">
            {/* Outer ring */}
            <circle
              cx="34"
              cy="34"
              r="30"
              fill="none"
              stroke="#0B2545"
              strokeOpacity="0.3"
              strokeWidth="1"
            />
            <circle
              cx="34"
              cy="34"
              r="22"
              fill="none"
              stroke="#0B2545"
              strokeOpacity="0.2"
              strokeWidth="0.75"
            />
            {/* 16 rays */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              const long = i % 4 === 0;
              const inner = long ? 22 : 26;
              const outer = long ? 30 : 29;
              return (
                <line
                  key={i}
                  x1={34 + Math.cos(angle) * inner}
                  y1={34 + Math.sin(angle) * inner}
                  x2={34 + Math.cos(angle) * outer}
                  y2={34 + Math.sin(angle) * outer}
                  stroke="#0B2545"
                  strokeOpacity={long ? 0.55 : 0.3}
                  strokeWidth="1"
                />
              );
            })}
            {/* Diamond pointer */}
            <polygon
              points="34,8 37,34 34,60 31,34"
              fill="#0B2545"
              fillOpacity="0.7"
            />
            <circle cx="34" cy="34" r="2" fill="#E63946" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Bottom-right: rotated volume stamp */}
      <motion.div
        className="absolute right-12 bottom-24 md:bottom-28"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 2.75 }}
      >
        <svg
          viewBox="0 0 128 128"
          className="w-[108px] h-[108px]"
          style={{ transform: 'rotate(-8deg)' }}
        >
          <defs>
            <path
              id="living-stamp-path"
              d="M 64,64 m -48,0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0"
            />
          </defs>
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke="#0B2545"
            strokeOpacity="0.4"
            strokeWidth="0.75"
          />
          <circle
            cx="64"
            cy="64"
            r="44"
            fill="none"
            stroke="#0B2545"
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
          <text
            fill="#0B2545"
            fillOpacity="0.7"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="2.5"
          >
            <textPath href="#living-stamp-path" startOffset="0%">
              MADE IN GHANA · VOL. 01 · EST 2026 ·
            </textPath>
          </text>
          <text
            x="64"
            y="62"
            textAnchor="middle"
            fill="#0B2545"
            fillOpacity="0.55"
            fontFamily="'Fraunces Variable', serif"
            fontStyle="italic"
            fontSize="16"
            fontWeight="400"
          >
            Skipper
          </text>
          <line
            x1="48"
            y1="68"
            x2="80"
            y2="68"
            stroke="#0B2545"
            strokeOpacity="0.5"
            strokeWidth="0.5"
          />
          <text
            x="64"
            y="80"
            textAnchor="middle"
            fill="#0B2545"
            fillOpacity="0.55"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize="7"
            fontWeight="600"
            letterSpacing="1.5"
          >
            EDITORIAL
          </text>
        </svg>
      </motion.div>

      {/* Bottom-left: tiny issue marker */}
      <motion.div
        className="absolute left-10 bottom-24 md:bottom-28 flex flex-col gap-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 2.8 }}
      >
        <span className="text-[9px] font-semibold tracking-[0.4em] uppercase text-brand-navy/50">
          Issue
        </span>
        <span
          className="font-display-italic text-[28px] leading-none text-brand-navy/60"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          N°01
        </span>
      </motion.div>
    </div>
  );
}
