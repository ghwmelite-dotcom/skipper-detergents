import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_EDITORIAL } from '@/lib/motion';
import { cn } from '@/lib/cn';

type TokenKind = 'plain' | 'italic' | 'highlight' | 'break';

interface Token {
  kind: TokenKind;
  text: string;
}

/**
 * Parses a headline string for markup tokens.
 * - `*word*` → italic (display-italic)
 * - `_word_` → italic + brand-red accent
 * - `\n` or `|` → line break
 */
function parseHeadline(input: string): Token[][] {
  const lines = input.split(/\n|\|/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const tokens: Token[] = [];
    const regex = /(\*[^*]+\*|_[^_]+_|[^\s*_]+|\s+)/g;
    const matches = line.match(regex) ?? [];
    for (const m of matches) {
      if (!m.trim()) {
        tokens.push({ kind: 'plain', text: ' ' });
        continue;
      }
      if (m.startsWith('*') && m.endsWith('*')) {
        tokens.push({ kind: 'italic', text: m.slice(1, -1) });
      } else if (m.startsWith('_') && m.endsWith('_')) {
        tokens.push({ kind: 'highlight', text: m.slice(1, -1) });
      } else {
        tokens.push({ kind: 'plain', text: m });
      }
    }
    return tokens;
  });
}

const wordVariants: Variants = {
  hidden: { opacity: 0, y: '0.5em', filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: EASE_EDITORIAL },
  },
};

interface SplitHeadlineProps {
  /** Headline text — supports `*italic*` and `_accent_` markers, `|` for line break. */
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  /** Stagger between word reveals. */
  stagger?: number;
  /** Delay before first word. */
  delay?: number;
  /** Play on mount (default) or on scroll-in. */
  trigger?: 'mount' | 'inView';
}

export function SplitHeadline({
  text,
  className,
  as = 'h1',
  stagger = 0.08,
  delay = 0,
  trigger = 'mount',
}: SplitHeadlineProps) {
  const reduced = useReducedMotion();
  const lines = parseHeadline(text);
  const MotionTag = motion[as];

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const animationProps = reduced
    ? {}
    : trigger === 'mount'
      ? { initial: 'hidden', animate: 'visible' }
      : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.3 } };

  function renderToken(token: Token, key: string): ReactNode {
    if (token.text === ' ') {
      return (
        <span key={key} aria-hidden="true">
          {' '}
        </span>
      );
    }
    const inner = token.text;
    const cls =
      token.kind === 'italic'
        ? 'font-display-italic'
        : token.kind === 'highlight'
          ? 'font-display-italic text-brand-red'
          : '';

    if (reduced) {
      return (
        <span key={key} className={cls}>
          {inner}
        </span>
      );
    }

    return (
      <span key={key} className="inline-block overflow-hidden align-baseline">
        <motion.span variants={wordVariants} className={cn('inline-block will-change-transform', cls)}>
          {inner}
        </motion.span>
      </span>
    );
  }

  return (
    <MotionTag
      variants={container}
      {...animationProps}
      className={cn('font-display font-medium text-balance', className)}
    >
      {lines.map((lineTokens, lineIdx) => (
        <span key={lineIdx} className="block">
          {lineTokens.map((token, tokenIdx) =>
            renderToken(token, `${lineIdx}-${tokenIdx}`),
          )}
        </span>
      ))}
    </MotionTag>
  );
}
