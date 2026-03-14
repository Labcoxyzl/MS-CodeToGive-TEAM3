"use client";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function SelectField({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  required = false,
  error,
}: SelectFieldProps) {
  return (
    <div className="lt-form-group">
      <label htmlFor={id} className="lt-label">
        {label}
        {required && <span className="lt-label__required">*</span>}
      </label>
      <select
        id={id}
        className={`lt-select${error ? " lt-select--error" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="lt-error-text">{error}</p>}
    </div>
  );
}
