"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import InputField from "@/app/components/ui/InputField";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Invalid credentials");
      }

      const data = await res.json();
      // Store tokens — adjust to your auth strategy
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // Redirect to dashboard
      window.location.href = "/dashboard";
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

      <div className={styles.loginWrapper}>
        <div className="lt-card">
          <h1 className="lt-card__title">Welcome Back</h1>
          <p className="lt-card__subtitle">
            Sign in to your Lemontree volunteer account
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
            <InputField
              id="login-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              required
              error={errors.email}
              autoComplete="email"
            />

            <InputField
              id="login-password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              required
              error={errors.password}
              autoComplete="current-password"
            />

            <Link href="/forgot-password" className={`lt-link ${styles.forgotLink}`}>
              Forgot password?
            </Link>

            <button
              type="submit"
              className="lt-btn lt-btn--primary"
              disabled={loading}
            >
              {loading ? <span className="lt-spinner" /> : "Log In"}
            </button>
          </form>

          <p className="lt-footer-text">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="lt-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
