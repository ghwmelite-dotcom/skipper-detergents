import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { API_BASE } from '@/lib/env';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useCart } from '@/hooks/useCart';

interface ManualPaymentUploadProps {
  orderId: string;
  orderNumber: string;
  manualPaymentDetails: string;
}

export function ManualPaymentUpload({
  orderId,
  orderNumber,
  manualPaymentDetails,
}: ManualPaymentUploadProps) {
  const navigate = useNavigate();
  const { clear } = useCart();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError('Please select a proof of payment file.');
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('order_id', orderId);

      const uploadRes = await fetch(`${API_BASE}/api/upload/payment-proof`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed. Please try a smaller file or different format.');
      }

      const uploadBody = await uploadRes.json() as { success: boolean; data?: { url: string } };
      if (!uploadBody.success || !uploadBody.data?.url) {
        throw new Error('Upload failed. Please try again.');
      }

      const proofUrl = uploadBody.data.url;

      // Patch order with proof URL
      await api.patch(`/api/orders/${orderId}/proof`, { proof_url: proofUrl });

      clear();
      navigate(`/order/${orderNumber}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment details */}
      <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
        <h3 className="font-semibold text-sm">Bank / MoMo Transfer Details</h3>
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {manualPaymentDetails}
        </pre>
      </div>

      {/* Upload section */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          After making the transfer, upload a screenshot or photo of your payment receipt below.
        </p>

        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          tabIndex={0}
          role="button"
          aria-label="Select payment proof file"
        >
          <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Click to upload receipt (JPG, PNG, PDF)</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-label="Upload payment proof"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleUpload}
          disabled={uploading || !file}
          aria-busy={uploading}
        >
          {uploading ? (
            <>
              <LoadingSpinner className="h-5 w-5" />
              Submitting proof...
            </>
          ) : (
            'Submit Payment Proof'
          )}
        </Button>
      </div>
    </div>
  );
}
