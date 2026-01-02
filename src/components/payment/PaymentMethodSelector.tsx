import { motion } from "framer-motion";

export type PaymentMethod = 'card' | 'wave_visa' | 'orange_visa';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

// Stripe logo
const StripeLogo = () => (
  <svg viewBox="0 0 60 25" className="h-7" fill="none">
    <path
      d="M5 11.2c0-.7.6-1 1.5-1 1.4 0 3.1.4 4.5 1.2V7.3C9.5 6.8 8 6.5 6.5 6.5 2.6 6.5 0 8.5 0 11.5c0 4.6 6.4 3.9 6.4 5.9 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v4.2c1.7.7 3.4 1 4.9 1 4 0 6.8-2 6.8-5 0-5-6.5-4.1-6.5-6.1z"
      fill="#6772E5"
    />
    <path
      d="M16.4 2.9l-4.8 1v3.8l4.8-1V2.9zm0 5.5h-4.8v12.3h4.8V8.4zm6.3-.2c-1.6 0-2.6.8-3.2 1.3l-.2-1h-4.3v16.1l4.8-1v-3.9c.6.4 1.4 1 2.8 1 2.9 0 5.5-2.3 5.5-7.4-.1-4.6-2.7-7.1-5.4-7.1zm-1 10.2c-.9 0-1.5-.3-1.9-.8v-6.1c.4-.5 1-.8 1.9-.8 1.5 0 2.5 1.6 2.5 3.9s-1 3.8-2.5 3.8zm12.6-10.2c-3 0-5.3 2.6-5.3 7.1 0 4.7 2.4 7.1 5.8 7.1 1.7 0 3-.4 4-1l-.9-3.2c-.8.3-1.7.6-2.8.6-1.1 0-2.1-.4-2.2-1.8h6.2c0-.2 0-.9 0-1.2-.1-4.6-2-7.6-4.8-7.6zm-1.2 5.6c0-1.3.8-1.9 1.5-1.9.7 0 1.4.6 1.4 1.9h-2.9z"
      fill="#6772E5"
    />
  </svg>
);

// VISA logo
const VisaLogo = () => (
  <div className="h-8 w-12 bg-white rounded flex items-center justify-center border border-border/30">
    <svg viewBox="0 0 48 16" className="h-4 w-10">
      <path fill="#1A1F71" d="M19.1 1.2l-3.1 13.6h-3.5l3.1-13.6h3.5zm14.2 8.8l1.8-5 1.1 5h-2.9zm3.9 4.8h3.2l-2.8-13.6h-2.9c-.7 0-1.2.4-1.5 1l-5.2 12.6h3.6l.7-2h4.4l.5 2zm-8.3-4.4c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.5-1.1.5 0 1.9-.1 3.5.6l.6-2.9c-.9-.3-2-.6-3.4-.6-3.6 0-6.1 1.9-6.1 4.6 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.2 1.4-1.8 0-2.9-.5-3.7-.9l-.7 3c.8.4 2.4.7 4 .8 3.8 0 6.3-1.9 6.4-4.8v-.2zM11 1.2L5.2 14.8H1.5L-1.5 4.1c-.2-.7-.4-.9-.9-1.2C-3.5 2.3-5.3 1.9-7 1.6l.1-.4h5.8c.7 0 1.4.5 1.5 1.4l1.4 7.7 3.6-9.1H11z" transform="translate(7 0)"/>
    </svg>
  </div>
);

// Wave logo badge
const WaveBadge = () => (
  <div className="h-8 w-12 rounded flex items-center justify-center" style={{ backgroundColor: '#1DC8F2' }}>
    <svg viewBox="0 0 40 20" className="h-4 w-8">
      <path 
        d="M4 8 Q10 2, 16 8 T28 8" 
        stroke="white" 
        strokeWidth="2.5" 
        fill="none"
        strokeLinecap="round"
      />
      <path 
        d="M4 14 Q10 8, 16 14 T28 14" 
        stroke="white" 
        strokeWidth="1.8" 
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  </div>
);

// Orange Money badge
const OrangeBadge = () => (
  <div className="h-8 w-12 rounded flex items-center justify-center" style={{ backgroundColor: '#FF6600' }}>
    <span className="text-white font-bold text-xs">OM</span>
  </div>
);

const PaymentMethodSelector = ({ selectedMethod, onSelect }: PaymentMethodSelectorProps) => {
  // This component is now display-only (showing accepted methods)
  // The actual selection happens via Stripe's payment form
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 py-4"
    >
      {/* Stripe logo */}
      <StripeLogo />
      
      {/* Payment method badges in a row */}
      <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/30">
        <VisaLogo />
        <WaveBadge />
        <OrangeBadge />
      </div>
      
      {/* Security text */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Paiement sécurisé par Stripe
      </div>
    </motion.div>
  );
};

export default PaymentMethodSelector;
