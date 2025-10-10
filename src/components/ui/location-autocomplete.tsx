import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { placesService, PlaceSuggestion } from "@/services/placesService";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "e.g., 123 Main St, Anytown",
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      // Don't fetch suggestions if disabled
      if (disabled) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      const results = await placesService.getSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsLoading(false);
    };

    const timeoutId = setTimeout(fetchSuggestions, 100);
    return () => clearTimeout(timeoutId);
  }, [value, disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInteracted(true);
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    onChange(suggestion.description);
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  const [isAutoSelected, setIsAutoSelected] = useState(false);

  useEffect(() => {
    const autoSelectExistingPlace = async () => {
      if (!value || disabled || isAutoSelected) return;

      const results = await placesService.getSuggestions(value);
      const match = results.find(
        (s) => s.description.toLowerCase() === value.toLowerCase()
      );

      if (match) {
        onSelect(match);
        setIsAutoSelected(true);
      }
    };

    autoSelectExistingPlace();
  }, [value, disabled, isAutoSelected]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled && userInteracted)
              setShowSuggestions(suggestions.length > 0);
          }}
          className="pl-10"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
        )}
      </div>

      {!disabled && userInteracted && showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium text-gray-900 text-sm">
                {suggestion.main_text}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {suggestion.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
