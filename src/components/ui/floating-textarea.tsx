import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const [shake, setShake] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setHasValue(value.length > 0);
      
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      if (props.onBlur) {
        props.onBlur(e);
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
        <textarea
          className={cn(
            "peer flex min-h-[80px] w-full rounded-md border bg-background px-3 pt-6 pb-2 text-base ring-offset-background placeholder:text-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 resize-none",
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
            top: isFloating ? "0.5rem" : "1.5rem",
            fontSize: isFloating ? "0.75rem" : "0.875rem",
            color: isFocused ? "hsl(var(--primary))" : error ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-3 pointer-events-none font-medium"
        >
          {label}
        </motion.label>

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

FloatingTextarea.displayName = "FloatingTextarea";

export { FloatingTextarea };
