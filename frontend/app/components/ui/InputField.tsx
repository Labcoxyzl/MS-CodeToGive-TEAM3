"use client";

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  autoComplete?: string;
}

export default function InputField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  error,
  autoComplete,
}: InputFieldProps) {
  return (
    <div className="lt-form-group">
      <label htmlFor={id} className="lt-label">
        {label}
        {required && <span className="lt-label__required">*</span>}
      </label>
      <input
        id={id}
        type={type}
        className={`lt-input${error ? " lt-input--error" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
      />
      {error && <p className="lt-error-text">{error}</p>}
    </div>
  );
}
