import { Badge } from '@/components/ui/badge';
import { daysUntil, formatDate } from '@/lib/utils';

export interface ExpiryBadgeProps {
  expiresAt?: Date | string | null;
  status?: string | null;
  className?: string;
}

/**
 * Colored expiry badge for a training certification.
 * - Expired (status EXPIRED or past date): purple
 * - Expiring within 30 days: amber (warning)
 * - Valid: green (success)
 * - No expiry yet: neutral gray reflecting the record status
 */
export function ExpiryBadge({ expiresAt, status, className }: ExpiryBadgeProps) {
  const days = daysUntil(expiresAt ?? null);

  if (status === 'EXPIRED' || (days !== null && days < 0)) {
    return (
      <Badge variant="purple" className={className}>
        Expired{days !== null ? ` ${Math.abs(days)}d ago` : ''}
      </Badge>
    );
  }

  if (days !== null && expiresAt) {
    if (days <= 30) {
      return (
        <Badge variant="warning" className={className}>
          Expires in {days}d
        </Badge>
      );
    }
    return (
      <Badge variant="success" className={className}>
        Valid until {formatDate(expiresAt)}
      </Badge>
    );
  }

  // No expiry date present — reflect the record status instead.
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="success" className={className}>
          Certified
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="teal" className={className}>
          In progress
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className={className}>
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="gray" className={className}>
          Not started
        </Badge>
      );
  }
}
