import { useState, useRef, useEffect } from "react";

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = value
    ? options.find((o) => o.value === value)?.label || placeholder
    : placeholder;

  return (
    <div className="lt-form-group" ref={containerRef}>
      <label htmlFor={id} className="lt-label">
        {label}
        {required && <span className="lt-label__required">*</span>}
      </label>

      <div style={{ position: "relative" }}>
        <button
          id={id}
          type="button"
          className={`lt-select${error ? " lt-select--error" : ""}`}
          onClick={() => setOpen(!open)}
          style={{ textAlign: "left", width: "100%", color: value ? 'inherit' : 'var(--lt-text-muted)' }}
        >
          {selectedLabel}
        </button>

        {open && (
          <div className="lt-select-dropdown" style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            background: "#fff",
            border: "1.5px solid var(--lt-border)",
            borderRadius: "var(--lt-radius-sm)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.10)",
            maxHeight: "200px",
            overflowY: "auto",
            marginTop: "4px"
          }}>
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="lt-select-option"
                style={{
                  padding: "10px 14px",
                  fontSize: "14px",
                  cursor: "pointer",
                  background: value === opt.value ? "var(--lt-teal-light)" : "transparent",
                  color: value === opt.value ? "var(--lt-teal)" : "var(--lt-text-primary)",
                  fontWeight: value === opt.value ? "600" : "normal"
                }}
                onMouseEnter={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = "var(--lt-card-bg-muted)";
                }}
                onMouseLeave={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = "transparent";
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="lt-error-text">{error}</p>}
    </div>
  );
}
