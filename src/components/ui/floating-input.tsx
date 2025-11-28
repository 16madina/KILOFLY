import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FloatingInputProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
  onValidate?: (value: string) => boolean | Promise<boolean>;
  showValidation?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, type, error, onValidate, showValidation = false, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const [isValid, setIsValid] = React.useState<boolean | null>(null);
    const [shake, setShake] = React.useState(false);
    const debounceTimer = React.useRef<NodeJS.Timeout>();

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHasValue(value.length > 0);
      
      if (props.onChange) {
        props.onChange(e);
      }

      // Validation en temps réel avec debounce
      if (showValidation && onValidate && value.length > 0) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(async () => {
          const valid = await onValidate(value);
          setIsValid(valid);
        }, 500);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleClear = () => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.value = "";
        setHasValue(false);
        setIsValid(null);
        if (props.onChange) {
          const event = new Event('input', { bubbles: true });
          ref.current.dispatchEvent(event);
        }
      }
    };

    React.useEffect(() => {
      if (error) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, [error]);

    const isFloating = isFocused || hasValue;

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "peer flex h-12 w-full rounded-md border bg-background px-3 pt-6 pb-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
            isFocused ? "border-primary border-2" : "border-input border",
            error && "border-destructive border-2",
            shake && "animate-[shake_0.5s_ease-in-out]",
            className
          )}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder={label}
          {...props}
        />
        
        {/* Floating Label */}
        <motion.label
          initial={false}
          animate={{
            top: isFloating ? "0.5rem" : "50%",
            translateY: isFloating ? "0%" : "-50%",
            fontSize: isFloating ? "0.75rem" : "0.875rem",
            color: isFocused ? "hsl(var(--primary))" : error ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-3 pointer-events-none font-medium"
        >
          {label}
        </motion.label>

        {/* Clear Button (iOS style) */}
        <AnimatePresence>
          {hasValue && !props.disabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Validation Icon */}
        {showValidation && hasValue && !props.disabled && isValid !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "absolute right-10 top-1/2 -translate-y-1/2",
              isValid ? "text-green-500" : "text-destructive"
            )}
          >
            {isValid ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </motion.div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs text-destructive mt-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
