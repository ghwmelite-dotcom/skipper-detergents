import { HTTPException } from 'hono/http-exception';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_PROOF_BYTES = 3 * 1024 * 1024;

export interface StoreProofInput {
  orderId: string;
  contentType: string;
  bodyBytes: Uint8Array | ArrayBuffer;
  sizeBytes: number;
  publicBase: string;
}

export interface StoreProofResult {
  key: string;
  url: string;
}

function idHex(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function storePaymentProof(
  bucket: R2Bucket,
  input: StoreProofInput,
): Promise<StoreProofResult> {
  const ext = MIME_EXT[input.contentType];
  if (!ext) {
    throw new HTTPException(415, {
      message: 'Only image/jpeg, image/png, and image/webp are allowed',
    });
  }
  if (input.sizeBytes > MAX_PROOF_BYTES) {
    throw new HTTPException(413, { message: 'File exceeds 3 MB limit' });
  }

  const key = `payment-proofs/${input.orderId}/${idHex()}.${ext}`;
  await bucket.put(key, input.bodyBytes, {
    httpMetadata: { contentType: input.contentType },
  });

  return {
    key,
    url: `${input.publicBase.replace(/\/$/, '')}/${key}`,
  };
}
