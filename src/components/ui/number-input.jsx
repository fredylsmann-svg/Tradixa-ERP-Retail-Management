import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatInputNumber, parseNumber } from "@/components/utils/currencyFormatter";
import { cn } from "@/lib/utils";

const NumberInput = React.forwardRef(({ className, value, onChange, onBlur, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatInputNumber(String(value)));
    }
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    const formatted = formatInputNumber(input);
    setDisplayValue(formatted);
    const numericValue = parseNumber(formatted);
    if (onChange) {
      const syntheticEvent = { ...e, target: { ...e.target, value: numericValue, name: e.target.name } };
      onChange(syntheticEvent);
    }
  };

  const handleBlur = (e) => {
    if (displayValue) setDisplayValue(formatInputNumber(displayValue));
    if (onBlur) onBlur(e);
  };

  return <Input ref={ref} className={cn(className)} value={displayValue} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" {...props} />;
});

NumberInput.displayName = "NumberInput";

export { NumberInput };
