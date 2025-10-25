import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DateFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

export function DateField({
  id,
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder,
  minDate,
  maxDate
}: DateFieldProps) {
  const handleIconClick = () => {
    if (!disabled) {
      const input = document.getElementById(id || '') as HTMLInputElement;
      if (input) {
        input.showPicker();
      }
    }
  };

  return (
    <div className="relative" onClick={handleIconClick}>
      <Calendar
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 hover:text-gray-600 transition-colors"
      />
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={minDate}
        max={maxDate}
        className={`pl-10 input-date ${className}`}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'textfield'
        }}
      />
    </div>
  );
}
