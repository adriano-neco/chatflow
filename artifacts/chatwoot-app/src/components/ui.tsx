import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' | 'icon', isLoading?: boolean }>(
  ({ className, variant = 'default', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98]': variant === 'default',
            'border-2 border-input bg-transparent hover:bg-muted text-foreground': variant === 'outline',
            'bg-transparent hover:bg-muted text-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm': variant === 'danger',
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
            'h-10 w-10 p-2': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-sm",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Avatar = ({ src, alt, initials, className, status }: { src?: string | null, alt?: string, initials: string, className?: string, status?: 'online'|'offline' }) => (
  <div className={cn("relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold overflow-hidden ring-2 ring-background", className)}>
    {src ? (
      <img src={src} alt={alt || "Avatar"} className="h-full w-full object-cover" />
    ) : (
      <span className="text-sm">{initials}</span>
    )}
    {status && (
      <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background", status === 'online' ? 'bg-green-500' : 'bg-gray-400')} />
    )}
  </div>
);

export const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default'|'success'|'warning'|'danger'|'outline', className?: string }) => {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors",
      {
        'bg-primary/10 text-primary': variant === 'default',
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': variant === 'success',
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': variant === 'warning',
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
        'border border-border text-foreground': variant === 'outline',
      },
      className
    )}>
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, footer?: React.ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-xl pointer-events-auto border border-border/50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {children}
              </div>
              {footer && (
                <div className="flex items-center justify-end gap-3 p-6 pt-2 bg-muted/20 border-t border-border/50">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
