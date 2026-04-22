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
  }

  export default class PaystackPop {
    newTransaction(options: TransactionOptions): void;
  }
}
