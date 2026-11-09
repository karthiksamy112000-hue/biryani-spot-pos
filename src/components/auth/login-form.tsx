"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/actions/auth";
import type { PortalRole } from "@/lib/auth/roles";

type LoginFormProps = {
  role: PortalRole;
};

const initialState = { error: null };

export function LoginForm({ role }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signInAction.bind(null, role),
    initialState,
  );
  const title = role === "owner" ? "Owner sign in" : "Staff sign in";
  const subtitle = role === "owner"
    ? "Access branch operations and business reports."
    : "Sign in to your assigned branch workspace.";

  return (
    <main className="auth-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Back to Biryani Spot portal selection">
          <span className="brand-monogram" aria-hidden="true">BS</span>
          <span className="brand-label">
            <span>Biryani Spot</span>
            <span>Operations</span>
          </span>
        </Link>
        <span className="topbar-label">SECURE ACCESS</span>
      </header>

      <section className="auth-main" aria-labelledby="login-title">
        <div className={`auth-panel auth-panel--${role}`}>
          <p className="eyebrow">{role === "owner" ? "OWNER PORTAL" : "STAFF PORTAL"}</p>
          <h1 id="login-title">{title}</h1>
          <p className="auth-description">{subtitle}</p>

          <form action={formAction} className="auth-form">
            <label htmlFor={`${role}-email`}>Email address</label>
            <input
              autoComplete="username"
              id={`${role}-email`}
              name="email"
              required
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@company.com"
            />

            <label htmlFor={`${role}-password`}>Password</label>
            <input
              autoComplete="current-password"
              id={`${role}-password`}
              name="password"
              required
              type="password"
              placeholder="Enter your password"
            />

            {state.error && <p className="auth-error" role="alert">{state.error}</p>}

            <button className="auth-submit" disabled={pending} type="submit">
              {pending ? "Verifying access..." : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <Link className="back-link" href="/">
            <span aria-hidden="true">←</span>
            Back to portal selection
          </Link>
        </div>
      </section>
    </main>
  );
}