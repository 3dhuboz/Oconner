import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-white border-gray-200',
  success: 'bg-green-50 border-green-200',
  error: 'bg-accent-light border-accent/30',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />,
  error: <AlertCircle className="h-4 w-4 text-accent shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  info: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
};

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
  title?: string;
  description?: string;
}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, variant = 'default', title, description, ...props }, ref) => (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
        'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {variantIcons[variant]}
      <div className="flex-1 min-w-0">
        {title && (
          <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="text-sm text-gray-600 mt-0.5">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close className="shrink-0 rounded p-0.5 hover:bg-gray-200/50 transition-colors">
        <X className="h-3 w-3 text-gray-500" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ),
);
Toast.displayName = ToastPrimitive.Root.displayName;

export { ToastProvider, ToastViewport, Toast };
export type { ToastVariant };
