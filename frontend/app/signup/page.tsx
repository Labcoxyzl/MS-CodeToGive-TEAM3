"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import Link from "next/link";
import InputField from "@/app/components/ui/InputField";
import SelectField from "@/app/components/ui/SelectField";
import styles from "./signup.module.css";

/* ── Option lists ──────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: "Event leader", label: "Event Leader" },
  { value: "Event participant", label: "Event Participant" },
  { value: "Event promoter", label: "Event Promoter" },
];

const CATEGORY_OPTIONS = [
  { value: "Corporate", label: "Corporate" },
  { value: "Leadership group", label: "Leadership Group" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
];

const DISCOVERY_OPTIONS = [
  { value: "social_media", label: "Social Media" },
  { value: "friend_family", label: "Friend or Family" },
  { value: "event", label: "Attended an Event" },
  { value: "flyer", label: "Saw a Flyer" },
  { value: "website", label: "Lemontree Website" },
  { value: "volunteer", label: "From a Volunteer" },
  { value: "employee_rep", label: "From an Employee / Representative" },
  { value: "news", label: "News / Press" },
  { value: "other", label: "Other" },
];

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Cantonese",
  "Arabic",
  "Hindi",
  "Portuguese",
  "Korean",
  "Vietnamese",
  "Tagalog",
  "Russian",
  "Haitian Creole",
  "Other",
];

/* ── Component ─────────────────────────────────────────────── */
export default function SignUpPage() {
  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // About you
  const [role, setRole] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // How did you find us
  const [referral, setReferral] = useState("");
  const [discovery, setDiscovery] = useState("");

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const langRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (!phone.trim()) errs.phone = "Phone number is required";
    if (!role) errs.role = "Please select a role";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            phone,
            role,
            organization: category,
            referral: referral || null,
            // DB columns exist — uncomment once backend endpoint accepts them:
            // location_name: location,
            // languages,
            // referral_source: discovery,         // "how did you find us"
            // referral_code: referral || null,    // backend resolves referred_by_user_id from this?
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Sign-up failed");
      }

      // Redirect to login on success
      window.location.href = "/login";
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lt-page">
      {/* Header */}
      <div className="lt-header">
        <Link href="/" className="lt-header__logo">
          <span>
            <span className="lt-header__logo-icon" aria-hidden="true" />
            lemontree
          </span>
        </Link>
      </div>

      <div className={styles.signupWrapper}>
        <div className="lt-card lt-card--wide">
          <h1 className="lt-card__title">Create Your Account</h1>
          <p className="lt-card__subtitle">
            Join Lemontree and start making an impact in your community
          </p>

          {apiError && (
            <div
              className="lt-error-text"
              style={{ marginBottom: 16, fontSize: 14 }}
              role="alert"
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Section 1: Account Info ────────────────────── */}
            <h2 className="lt-section-header">Account Info</h2>

            <InputField
              id="signup-name"
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={setName}
              required
              error={errors.name}
              autoComplete="name"
            />

            <InputField
              id="signup-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              required
              error={errors.email}
              autoComplete="email"
            />

            <div className={styles.row}>
              <InputField
                id="signup-password"
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={setPassword}
                required
                error={errors.password}
                autoComplete="new-password"
              />

              <InputField
                id="signup-phone"
                label="Phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={setPhone}
                required
                error={errors.phone}
                autoComplete="tel"
              />
            </div>

            {/* ── Section 2: About You ───────────────────────── */}
            <h2 className="lt-section-header">About You</h2>

            <div className={styles.row}>
              <SelectField
                id="signup-role"
                label="Role"
                options={ROLE_OPTIONS}
                value={role}
                onChange={setRole}
                placeholder="Choose your role"
                required
                error={errors.role}
              />

              <SelectField
                id="signup-category"
                label="Category"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={setCategory}
                placeholder="Select a category"
              />
            </div>

            <InputField
              id="signup-location"
              label="Location"
              placeholder="City, State"
              value={location}
              onChange={setLocation}
              autoComplete="address-level2"
            />

            {/* Languages multi-select */}
            <div className="lt-form-group" ref={langRef}>
              <label className="lt-label">Languages Spoken</label>
              <div className={styles.languageSelect}>
                <button
                  type="button"
                  className="lt-select"
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  style={{ textAlign: "left" }}
                >
                  {languages.length > 0
                    ? `${languages.length} selected`
                    : "Select languages"}
                </button>
                {langDropdownOpen && (
                  <div className={styles.languageDropdown}>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <label key={lang} className={styles.languageOption}>
                        <input
                          type="checkbox"
                          checked={languages.includes(lang)}
                          onChange={() => toggleLanguage(lang)}
                        />
                        {lang}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {languages.length > 0 && (
                <div className="lt-tags-wrapper">
                  {languages.map((lang) => (
                    <span key={lang} className="lt-tag">
                      {lang}
                      <button
                        type="button"
                        className="lt-tag__remove"
                        onClick={() => toggleLanguage(lang)}
                        aria-label={`Remove ${lang}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 3: How did you find us? ────────────── */}
            <h2 className="lt-section-header">How Did You Find Us?</h2>

            <SelectField
              id="signup-discovery"
              label="How did you hear about Lemontree?"
              options={DISCOVERY_OPTIONS}
              value={discovery}
              onChange={setDiscovery}
              placeholder="Select an option"
            />

            <InputField
              id="signup-referral"
              label="Referral Code"
              placeholder="Optional"
              value={referral}
              onChange={setReferral}
            />

            {/* Submit */}
            <button
              type="submit"
              className="lt-btn lt-btn--primary"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <span className="lt-spinner" /> : "Create Account"}
            </button>
          </form>

          <p className="lt-footer-text">
            Already have an account?{" "}
            <Link href="/login" className="lt-link">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
