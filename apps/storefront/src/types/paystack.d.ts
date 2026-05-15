declare module '@paystack/inline-js' {
  interface TransactionOptions {
    key: string;
    email: string;
    reference?: string;
    accessCode?: string;
    amount?: number;
    currency?: string;
    onSuccess?: (transaction: { reference: string }) => void;
    onCancel?: () => void;
    onError?: (error: Error) => void;
    /** Fires whenever the iframe is closed by any means (X click, success, cancel).
     *  Use as a safety net so the parent's "loading" state is always cleared. */
    onClose?: () => void;
  }

  export default class PaystackPop {
    newTransaction(options: TransactionOptions): void;
  }
}
