import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { 
    label: string; 
    className: string; 
    dotColor: string;
  }> = {
    'MATCHED': { 
      label: 'ตรงกัน', 
      className: 'bg-green-50 text-green-700 border-green-200',
      dotColor: 'bg-green-500'
    },
    'DISPENSED_NOT_USED': { 
      label: 'เบิกแล้วไม่ใช้', 
      className: 'bg-orange-50 text-orange-700 border-orange-200',
      dotColor: 'bg-orange-500'
    },
    'USED_WITHOUT_DISPENSE': { 
      label: 'ใช้โดยไม่เบิก', 
      className: 'bg-red-50 text-red-700 border-red-200',
      dotColor: 'bg-red-500'
    },
    'DISPENSE_EXCEEDS_USAGE': { 
      label: 'เบิกเกิน', 
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      dotColor: 'bg-yellow-500'
    },
    'USAGE_EXCEEDS_DISPENSE': { 
      label: 'ใช้เกิน', 
      className: 'bg-purple-50 text-purple-700 border-purple-200',
      dotColor: 'bg-purple-500'
    }
  };

  const config = statusConfig[status] || { 
    label: status, 
    className: 'bg-gray-50 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500'
  };
  
  return (
    <Badge variant="outline" className={`${config.className} border`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${config.dotColor}`}></span>
      {config.label}
    </Badge>
  );
}
