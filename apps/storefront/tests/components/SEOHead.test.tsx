import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEOHead } from '../../src/components/seo/SEOHead';

// react-helmet-async defers DOM writes to requestAnimationFrame by default;
// replace it with a synchronous stub so Helmet flushes immediately in jsdom.
beforeEach(() => {
  document.head.innerHTML = '';
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithHelmet(ui: React.ReactNode) {
  return act(() => {
    render(<HelmetProvider>{ui}</HelmetProvider>);
  });
}

describe('SEOHead', () => {
  it('sets title with store name suffix', async () => {
    await renderWithHelmet(<SEOHead title="Shop" description="All products" />);
    expect(document.title).toContain('Shop');
    expect(document.title).toContain('Skipper CleanCare');
  });

  it('does not duplicate the store name when already in the title', async () => {
    await renderWithHelmet(<SEOHead title="Skipper CleanCare — Home" />);
    expect(document.title).toBe('Skipper CleanCare — Home');
  });

  it('sets og:title and og:description meta tags', async () => {
    await renderWithHelmet(<SEOHead title="Shop" description="Browse everything" />);
    const og = document.querySelector('meta[property="og:title"]');
    expect(og?.getAttribute('content')).toContain('Shop');
    const desc = document.querySelector('meta[property="og:description"]');
    expect(desc?.getAttribute('content')).toBe('Browse everything');
  });

  it('sets noindex meta when noindex=true', async () => {
    await renderWithHelmet(<SEOHead title="Cart" noindex />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('noindex,follow');
  });
});
