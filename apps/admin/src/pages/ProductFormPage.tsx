import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Star, Upload, Image as ImageIcon } from 'lucide-react';
import {
  productCreateSchema,
  type Category,
  type Product,
  type ProductImage,
  type ProductVariant,
  type BulkPricingTier,
} from '@skipper/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Label, FieldError } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { slugify, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

type FormValues = z.infer<typeof productCreateSchema>;

interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  bulk_tiers: BulkPricingTier[];
  category: { id: string; name: string; slug: string } | null;
}

type Tab = 'details' | 'images' | 'bulk' | 'variants';

export function ProductFormPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const [tab, setTab] = useState<Tab>('details');

  return (
    <div>
      <div className="mb-3">
        <Link to="/products" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to products
        </Link>
      </div>

      <PageHeader title={isNew ? 'New product' : 'Edit product'} />

      {!isNew && (
        <div className="mb-4 flex items-center gap-0.5 border-b border-ink-200 -mt-2">
          {(['details', 'images', 'bulk', 'variants'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                tab === t
                  ? 'text-navy-700 border-navy-700'
                  : 'text-ink-600 border-transparent hover:text-ink-900',
              )}
            >
              {t === 'details' && 'Details'}
              {t === 'images' && 'Images'}
              {t === 'bulk' && 'Bulk pricing'}
              {t === 'variants' && 'Variants'}
            </button>
          ))}
        </div>
      )}

      {(isNew || tab === 'details') && <DetailsTab productId={isNew ? null : id!} isNew={isNew} />}
      {!isNew && tab === 'images' && <ImagesTab productId={id!} />}
      {!isNew && tab === 'bulk' && <BulkPricingTab productId={id!} />}
      {!isNew && tab === 'variants' && <VariantsPlaceholder />}
    </div>
  );
}

// ---------- DETAILS TAB ----------

function DetailsTab({ productId, isNew }: { productId: string | null; isNew: boolean }): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: () => api.get<Category[]>('/api/admin/categories'),
  });

  const { data: product } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => api.get<ProductDetail>(`/api/admin/products/${productId}`),
    enabled: !!productId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      short_description: '',
      category_id: '',
      brand: '',
      sku: '',
      unit_price: 0,
      stock_quantity: 0,
      low_stock_threshold: 10,
      is_active: true,
      is_featured: false,
      is_bulk_available: false,
      bulk_minimum_qty: 10,
      tags: '',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description ?? '',
        category_id: product.category_id,
        brand: product.brand ?? '',
        sku: product.sku ?? '',
        unit_price: product.unit_price,
        compare_at_price: product.compare_at_price ?? undefined,
        cost_price: product.cost_price ?? undefined,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        weight_kg: product.weight_kg ?? undefined,
        is_active: product.is_active,
        is_featured: product.is_featured,
        is_bulk_available: product.is_bulk_available,
        bulk_minimum_qty: product.bulk_minimum_qty,
        tags: product.tags ?? '',
        seo_title: product.seo_title ?? '',
        seo_description: product.seo_description ?? '',
        seo_keywords: product.seo_keywords ?? '',
      });
    }
  }, [product, reset]);

  // Auto-slug
  const nameValue = watch('name');
  useEffect(() => {
    if (isNew && nameValue) {
      setValue('slug', slugify(nameValue), { shouldDirty: true });
    }
  }, [nameValue, isNew, setValue]);

  // Warn on unsaved navigation
  useEffect(() => {
    const h = (e: BeforeUnloadEvent): void => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post<Product>('/api/admin/products', values),
    onSuccess: (created) => {
      toast.push('Product created', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      navigate(`/products/${created.id}`);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch<Product>(`/api/admin/products/${productId}`, values),
    onSuccess: () => {
      toast.push('Changes saved', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product', productId] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const onSubmit = (values: FormValues): void => {
    // Strip empty-string optional fields
    const cleaned: FormValues = { ...values };
    const optKeys: (keyof FormValues)[] = [
      'short_description',
      'brand',
      'sku',
      'tags',
      'seo_title',
      'seo_description',
      'seo_keywords',
    ];
    for (const k of optKeys) {
      if (typeof cleaned[k] === 'string' && (cleaned[k] as string).trim() === '') {
        delete cleaned[k];
      }
    }
    if (isNew) createMutation.mutate(cleaned);
    else updateMutation.mutate(cleaned);
  };

  const submitting = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card>
          <CardHeader title="Basic info" />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" invalid={!!errors.name} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" invalid={!!errors.slug} {...register('slug')} />
              <FieldError message={errors.slug?.message} />
            </div>
            <div>
              <Label htmlFor="category_id">Category *</Label>
              <Select id="category_id" invalid={!!errors.category_id} {...register('category_id')}>
                <option value="">Select…</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.category_id?.message} />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="short_description">Short description</Label>
              <Textarea id="short_description" rows={2} {...register('short_description')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                rows={6}
                invalid={!!errors.description}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pricing & inventory" />
          <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="unit_price">Unit price (GHS) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                inputMode="decimal"
                invalid={!!errors.unit_price}
                {...register('unit_price', { valueAsNumber: true })}
              />
              <FieldError message={errors.unit_price?.message} />
            </div>
            <div>
              <Label htmlFor="compare_at_price">Compare-at price</Label>
              <Input
                id="compare_at_price"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('compare_at_price', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : Number(v)) })}
              />
            </div>
            <div>
              <Label htmlFor="cost_price">Cost price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('cost_price', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : Number(v)) })}
              />
            </div>
            <div>
              <Label htmlFor="stock_quantity">Stock quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                inputMode="numeric"
                invalid={!!errors.stock_quantity}
                {...register('stock_quantity', { valueAsNumber: true })}
              />
              <FieldError message={errors.stock_quantity?.message} />
            </div>
            <div>
              <Label htmlFor="low_stock_threshold">Low-stock threshold</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                inputMode="numeric"
                {...register('low_stock_threshold', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.001"
                inputMode="decimal"
                {...register('weight_kg', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : Number(v)) })}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="SEO" />
          <CardBody className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="seo_title">SEO title</Label>
              <Input id="seo_title" {...register('seo_title')} />
            </div>
            <div>
              <Label htmlFor="seo_description">SEO description</Label>
              <Textarea id="seo_description" rows={2} {...register('seo_description')} />
            </div>
            <div>
              <Label htmlFor="seo_keywords">SEO keywords</Label>
              <Input id="seo_keywords" {...register('seo_keywords')} />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" {...register('tags')} />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Status" />
          <CardBody className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active')} className="h-3.5 w-3.5" />
              Active (visible in storefront)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_featured')} className="h-3.5 w-3.5" />
              Featured
            </label>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Bulk" />
          <CardBody className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_bulk_available')} className="h-3.5 w-3.5" />
              Available for bulk orders
            </label>
            <div>
              <Label htmlFor="bulk_minimum_qty">Minimum bulk quantity</Label>
              <Input
                id="bulk_minimum_qty"
                type="number"
                inputMode="numeric"
                {...register('bulk_minimum_qty', { valueAsNumber: true })}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={submitting} className="w-full">
            {isNew ? 'Create product' : 'Save changes'}
          </Button>
        </div>
        {!isNew && isDirty && (
          <div className="rounded border border-warning-500/30 bg-warning-50 px-3 py-2 text-xs text-warning-600">
            You have unsaved changes.
          </div>
        )}
      </div>
    </form>
  );
}

// ---------- IMAGES TAB ----------

function ImagesTab({ productId }: { productId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => api.get<ProductDetail>(`/api/admin/products/${productId}`),
  });

  const upload = async (file: File, makePrimary: boolean): Promise<void> => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (makePrimary) form.append('is_primary', 'true');
      await api.postFormData(`/api/admin/products/${productId}/images`, form);
      toast.push('Image uploaded', 'success');
      qc.invalidateQueries({ queryKey: ['admin-product', productId] });
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const patchMutation = useMutation({
    mutationFn: (p: { imageId: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/admin/products/${productId}/images/${p.imageId}`, p.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-product', productId] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      api.del(`/api/admin/products/${productId}/images/${imageId}`),
    onSuccess: () => {
      toast.push('Image removed', 'success');
      qc.invalidateQueries({ queryKey: ['admin-product', productId] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const images = product?.images ?? [];
  const primaryExists = images.some((i) => i.is_primary);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Upload image" subtitle="JPG, PNG, WEBP or GIF up to 5 MB" />
        <CardBody>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-ink-200 px-4 py-8 text-sm text-ink-500 hover:border-cyan-500 hover:text-ink-700 transition-colors">
            {uploading ? (
              <span>Uploading…</span>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Click to upload — first upload will be set as primary
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f, !primaryExists);
                e.target.value = '';
              }}
            />
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Images (${images.length})`} />
        <CardBody>
          {images.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-ink-500 text-sm">
              <ImageIcon className="mr-2 h-4 w-4" /> No images yet.
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img) => (
                <li key={img.id} className="rounded border border-ink-200 overflow-hidden bg-white">
                  <div className="aspect-square bg-ink-50 relative">
                    <img src={img.url} alt={img.alt_text ?? ''} className="h-full w-full object-cover" />
                    {img.is_primary && (
                      <div className="absolute top-1.5 left-1.5">
                        <Badge tone="info">
                          <Star className="h-3 w-3 inline" /> Primary
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between gap-1">
                    <button
                      onClick={() =>
                        patchMutation.mutate({
                          imageId: img.id,
                          patch: { is_primary: true },
                        })
                      }
                      disabled={img.is_primary || patchMutation.isPending}
                      className="text-xs text-cyan-600 hover:underline disabled:opacity-50"
                    >
                      Set primary
                    </button>
                    <button
                      onClick={() => setConfirmDelete(img.id)}
                      className="text-danger-500 hover:text-danger-600"
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this image?"
        description="The file will be removed from storage and cannot be recovered."
        tone="danger"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
      />
    </div>
  );
}

// ---------- BULK TIERS TAB ----------

interface TierRow {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  label: string;
}

function BulkPricingTab({ productId }: { productId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: product } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => api.get<ProductDetail>(`/api/admin/products/${productId}`),
  });

  const [rows, setRows] = useState<TierRow[]>([]);

  useEffect(() => {
    if (product?.bulk_tiers) {
      setRows(
        product.bulk_tiers.map((t) => ({
          min_quantity: t.min_quantity,
          max_quantity: t.max_quantity,
          unit_price: t.unit_price,
          label: t.label ?? '',
        })),
      );
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: (tiers: TierRow[]) =>
      api.put(`/api/admin/products/${productId}/bulk-tiers`, {
        tiers: tiers.map((t) => ({
          min_quantity: t.min_quantity,
          max_quantity: t.max_quantity,
          unit_price: t.unit_price,
          ...(t.label ? { label: t.label } : {}),
        })),
      }),
    onSuccess: () => {
      toast.push('Bulk tiers saved', 'success');
      qc.invalidateQueries({ queryKey: ['admin-product', productId] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const addRow = (): void =>
    setRows((r) => [
      ...r,
      { min_quantity: 1, max_quantity: null, unit_price: product?.unit_price ?? 0, label: '' },
    ]);
  const removeRow = (idx: number): void => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<TierRow>): void =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  return (
    <Card>
      <CardHeader
        title="Bulk pricing tiers"
        subtitle="Customers buying at or above the minimum quantity get the tier price."
        action={
          <Button size="sm" variant="secondary" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Add tier
          </Button>
        }
      />
      <CardBody className="p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="pl-4">Min qty</th>
              <th>Max qty</th>
              <th>Unit price (GHS)</th>
              <th>Label</th>
              <th className="pr-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-ink-500 text-sm">
                  No bulk tiers — customers pay the base unit price.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx}>
                  <td className="pl-4">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={r.min_quantity}
                      onChange={(e) =>
                        updateRow(idx, { min_quantity: Number(e.target.value) || 0 })
                      }
                      className="w-24"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={r.max_quantity ?? ''}
                      onChange={(e) =>
                        updateRow(idx, {
                          max_quantity: e.target.value === '' ? null : Number(e.target.value) || 0,
                        })
                      }
                      placeholder="∞"
                      className="w-24"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={r.unit_price}
                      onChange={(e) =>
                        updateRow(idx, { unit_price: Number(e.target.value) || 0 })
                      }
                      className="w-32"
                    />
                    <div className="text-xs text-ink-500 mt-0.5">
                      {product && r.unit_price < product.unit_price && (
                        <>
                          {Math.round((1 - r.unit_price / product.unit_price) * 100)}% off base{' '}
                          ({formatCurrency(product.unit_price)})
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <Input
                      value={r.label}
                      onChange={(e) => updateRow(idx, { label: e.target.value })}
                      placeholder="e.g. Case (12+)"
                    />
                  </td>
                  <td className="pr-4">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-danger-500 hover:text-danger-600"
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="border-t border-ink-200 px-4 py-3 flex justify-end">
          <Button
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(rows)}
            disabled={rows.some(
              (r) =>
                !Number.isFinite(r.min_quantity) ||
                r.min_quantity < 1 ||
                !Number.isFinite(r.unit_price) ||
                r.unit_price < 0,
            )}
          >
            Save tiers
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function VariantsPlaceholder(): JSX.Element {
  return (
    <Card>
      <CardBody className="text-center py-10">
        <p className="text-sm text-ink-600">
          Variant management is coming soon. For now, use separate products per variant.
        </p>
      </CardBody>
    </Card>
  );
}
