import { getOrderStatusText, getOrderStatusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getOrderStatusColor(status)}`}>
      {getOrderStatusText(status)}
    </span>
  );
}
