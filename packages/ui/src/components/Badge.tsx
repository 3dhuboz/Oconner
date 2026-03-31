import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import type { OrderStatus } from '@butcher/shared';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-brand-light text-brand',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-accent-light text-accent',
        info: 'bg-blue-100 text-blue-800',
        neutral: 'bg-gray-100 text-gray-600',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const ORDER_STATUS_VARIANT: Record<OrderStatus, NonNullable<BadgeProps['variant']>> = {
  pending_payment: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  packed: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'neutral',
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = {
    pending_payment: 'Pending Payment',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    packed: 'Packed',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return <Badge variant={ORDER_STATUS_VARIANT[status]}>{labels[status]}</Badge>;
}

export { Badge, badgeVariants, OrderStatusBadge };
