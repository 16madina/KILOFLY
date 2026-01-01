// CinetPay Seamless SDK Type Definitions
declare global {
  interface Window {
    CinetPay: {
      setConfig: (config: {
        apikey: string;
        site_id: string;
        notify_url: string;
        mode: 'PRODUCTION' | 'TEST';
      }) => void;
      getCheckout: (options: {
        transaction_id: string;
        amount: number;
        currency: string;
        channels: string;
        description: string;
        customer_name?: string;
        customer_surname?: string;
        customer_email?: string;
        customer_phone_number?: string;
        customer_address?: string;
        customer_city?: string;
        customer_country?: string;
        customer_state?: string;
        customer_zip_code?: string;
        alternative_currency?: string;
        lock_amount?: boolean;
        lock_currency?: boolean;
        return_url?: string;
        cancel_url?: string;
        metadata?: string;
        lang?: string;
        lock_phone_number?: boolean;
      }) => void;
      // Callbacks can be assigned directly as properties
      waitResponse: ((data: {
        status: 'ACCEPTED' | 'REFUSED' | 'PENDING';
        payment_token?: string;
        payment_url?: string;
        transaction_id?: string;
        amount?: number;
        currency?: string;
        message?: string;
      }) => void) | ((callback: (data: {
        status: 'ACCEPTED' | 'REFUSED' | 'PENDING';
        payment_token?: string;
        payment_url?: string;
        transaction_id?: string;
        amount?: number;
        currency?: string;
        message?: string;
      }) => void) => void);
      onClose: (() => void) | ((callback: () => void) => void);
      onError?: (error: { message?: string; code?: string }) => void;
    };
  }
}

export {};
