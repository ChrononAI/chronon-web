import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

interface AutocompleteFieldProps {
  placeholder?: string;
  options: AutocompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  className?: string;
}

const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  placeholder = "Type to search...",
  options,
  value = '',
  onChange,
  onSelect,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(value.toLowerCase()) ||
        option.value.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
      setHighlightedIndex(0);
    } else {
      setFilteredOptions(options);
      setHighlightedIndex(0);
    }
  }, [value, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow for option selection
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleOptionSelect = (option: AutocompleteOption) => {
    onChange(option.value);
    onSelect?.(option);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="pr-8"
        />
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 shadow-lg">
          <CardContent className="p-0">
            <div ref={listRef} className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option, index) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-none px-3 py-2 text-left",
                    index === highlightedIndex && "bg-accent",
                    index === 0 && "rounded-t-md",
                    index === filteredOptions.length - 1 && "rounded-b-md"
                  )}
                  onClick={() => handleOptionSelect(option)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isOpen && filteredOptions.length === 0 && value && (
        <Card className="absolute z-10 w-full mt-1 shadow-lg">
          <CardContent className="p-3">
            <div className="text-sm text-muted-foreground text-center">
              No results found
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutocompleteField;