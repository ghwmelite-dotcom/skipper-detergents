import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Breadcrumbs } from '../../src/components/seo/Breadcrumbs';

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

function renderWithProviders(ui: React.ReactNode) {
  return act(() => {
    render(
      <HelmetProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </HelmetProvider>,
    );
  });
}

describe('Breadcrumbs', () => {
  it('renders each item, linking all but the last', async () => {
    await renderWithProviders(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: 'Detergents' },
        ]}
      />,
    );
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Shop' })).toBeInTheDocument();
    expect(screen.getByText('Detergents')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Detergents' })).toBeNull();
  });

  it('emits a BreadcrumbList JSON-LD script', async () => {
    await renderWithProviders(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
        ]}
        origin="https://example.test"
      />,
    );
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? '{}');
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0].name).toBe('Home');
    expect(data.itemListElement[0].item).toBe('https://example.test/');
  });
});
