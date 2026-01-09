import { Input } from "../ui/input";

interface NumberRangeValue {
  gte?: number;
  lte?: number;
}

interface NumberRangeInputProps {
  value?: NumberRangeValue;
  onChange: (value: NumberRangeValue) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

const AmountRangePicker: React.FC<NumberRangeInputProps> = ({
  value,
  onChange,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
}) => {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        placeholder={minPlaceholder}
        value={value?.gte ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange({
            ...value,
            gte: v === "" ? undefined : Number(v),
          });
        }}
      />

      <Input
        type="number"
        placeholder={maxPlaceholder}
        value={value?.lte ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange({
            ...value,
            lte: v === "" ? undefined : Number(v),
          });
        }}
      />
    </div>
  );
};

export default AmountRangePicker;
