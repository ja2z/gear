import { useId } from 'react';

/**
 * Native date input for outing forms.
 * On iOS/Android opens the system date picker (Apple Calendar / Material style).
 * Value/onChange use `YYYY-MM-DD` strings for API compatibility.
 */
export default function OutingDatePicker({
  id: idProp,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder,
}) {
  const genId = useId();
  const fieldId = idProp ?? genId;

  return (
    <input
      type="date"
      id={fieldId}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      min={minDate || undefined}
      max={maxDate || undefined}
      disabled={disabled}
      className="form-input w-full cursor-pointer"
    />
  );
}
