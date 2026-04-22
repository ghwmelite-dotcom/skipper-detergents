import { Link } from 'react-router-dom';
import { Heart, Award, Leaf } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Button } from '@/components/ui/button';

const VALUES = [
  {
    icon: Heart,
    title: 'Made for Ghanaian Homes',
    body: 'Every product in our range is selected with Ghanaian families in mind — effective formulas, practical pack sizes, and prices that respect your budget.',
  },
  {
    icon: Award,
    title: 'Quality You Can Trust',
    body: 'We source from established manufacturers and verify every batch before it reaches your door. No shortcuts. No compromises.',
  },
  {
    icon: Leaf,
    title: 'Responsible Sourcing',
    body: 'We are committed to reducing our environmental footprint by favouring suppliers with responsible production practices and recyclable packaging.',
  },
];

export default function About() {
  return (
    <>
      <SEOHead
        title="About Skipper Detergents"
        description="Skipper Detergents is a Ghanaian household-essentials brand committed to delivering quality cleaning products at fair prices."
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

      <div className="container py-12 max-w-3xl space-y-16">
        {/* Hero */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-primary">
            About Skipper Detergents
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Skipper Detergents was founded with a simple mission: to make premium household
            cleaning essentials accessible to every Ghanaian home. From laundry detergents and
            dishwashing liquids to toilet tissue and bathroom accessories, our catalogue covers
            everything your household needs to stay clean, comfortable, and well-stocked.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We started as a small distribution operation in Accra, working directly with
            manufacturers to keep costs low and quality high. Word spread quickly — our customers
            told their neighbours, their offices, their churches. Today we serve homes, hotels,
            schools, restaurants, and retailers across Greater Accra, with shipping options
            reaching all regions of Ghana.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Bulk pricing is at the heart of what we do. We believe that buying in quantity
            shouldn't only be a privilege for large businesses. Our tiered pricing is open to
            everyone — whether you're stocking up for a month at home or sourcing for a 50-room
            hotel, you'll always get a fair, transparent price.
          </p>
        </div>

        {/* Values */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Our Values</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link to="/shop">
            <Button variant="primary" size="lg">Shop our products</Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="lg">Get in touch</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
