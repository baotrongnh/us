"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, LogOut, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";

type AdminStatus = "signed-out" | "signed-in";

export function AdminPanel() {
  const [status, setStatus] = useState<AdminStatus>("signed-out");
  const [password, setPassword] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSettings = async (adminPassword: string) => {
    const response = await fetch("/api/admin/settings", {
      headers: { "x-admin-password": adminPassword },
      cache: "no-store",
    });
    const data = (await response.json()) as { maintenance?: boolean; error?: string };
    if (!response.ok || typeof data.maintenance !== "boolean") {
      throw new Error(data.error ?? "Could not load settings.");
    }
    setMaintenance(data.maintenance);
    setStatus("signed-in");
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      await loadSettings(password);
      setStatus("signed-in");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load settings.");
    }
  };

  const updateMaintenance = async (nextValue: boolean) => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ maintenance: nextValue }),
      });
      const data = (await response.json()) as { maintenance?: boolean; error?: string };
      if (!response.ok || typeof data.maintenance !== "boolean") {
        throw new Error(data.error ?? "Could not save settings.");
      }
      setMaintenance(data.maintenance);
      setNotice("Settings saved. The website will use this mode on the next page request.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    setPassword("");
    setStatus("signed-out");
    setNotice("");
    setError("");
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" href="/">ours<span>.</span></Link>
        {status === "signed-in" && (
          <button type="button" className="admin-logout" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        )}
        </header>
        <section className="admin-card">
          {status === "signed-out" ? (
          <>
            <div className="admin-icon"><LockKeyhole size={22} /></div>
            <p className="admin-eyebrow">Private area</p>
            <h1>Admin sign in</h1>
            <p className="admin-muted">Use the same password as the Letters section.</p>
            <form className="admin-login-form" onSubmit={signIn}>
              <label htmlFor="admin-password">Password</label>
              <input
                autoComplete="current-password"
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
                required
              />
              <button type="submit" className="admin-primary-button">Continue</button>
            </form>
            {error && <p className="admin-error" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <div className="admin-icon"><Settings2 size={22} /></div>
            <p className="admin-eyebrow">Website settings</p>
            <h1>Admin</h1>
            <div className="admin-setting">
              <div className="admin-setting-copy">
                <span className="admin-setting-title">Maintenance mode</span>
                <span className="admin-muted">
                  {maintenance ? "Visitors see the maintenance page." : "The website is available to visitors."}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={maintenance}
                aria-label="Maintenance mode"
                className={`admin-switch ${maintenance ? "is-on" : ""}`}
                disabled={isSaving}
                onClick={() => void updateMaintenance(!maintenance)}
              >
                <span />
              </button>
            </div>
            <div className="admin-connection"><ShieldCheck size={16} /> Settings are stored in Supabase.</div>
            {notice && <p className="admin-notice" role="status">{notice}</p>}
            {error && <p className="admin-error" role="alert">{error}</p>}
          </>
        )}
      </section>
      <footer className="admin-footer">ours. · Admin</footer>
    </main>
  );
}
