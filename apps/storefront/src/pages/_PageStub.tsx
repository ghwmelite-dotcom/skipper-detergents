import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/Breadcrumbs';

export interface PageStubProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  noindex?: boolean;
  children?: React.ReactNode;
}

export function PageStub({ title, description, breadcrumbs, noindex, children }: PageStubProps) {
  return (
    <>
      <SEOHead
        title={title}
        {...(description !== undefined && { description })}
        {...(noindex !== undefined && { noindex })}
      />
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="container py-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">{title}</h1>
        {description && <p className="mt-3 text-muted-foreground max-w-2xl">{description}</p>}
        {children}
      </div>
    </>
  );
}
