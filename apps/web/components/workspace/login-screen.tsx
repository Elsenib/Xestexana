"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, CurrentUser, TOKEN_KEY } from "../../lib/lovelydent-api";
export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) router.replace("/dashboard");
  }, [router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<{ token: string; user: CurrentUser }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      if (result.user.role === "PATIENT")
        throw new Error("Bu giriş yalnız klinika əməkdaşları üçündür.");
      localStorage.setItem(TOKEN_KEY, result.token);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Giriş mümkün olmadı.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="ws-login">
      <section className="ws-login-copy">
        <div className="ws-brand ws-brand--dark">
          <span>LD</span>
          <b>LovelyDent</b>
        </div>
        <div>
          <p className="ws-eyebrow">Klinikanın gündəlik iş məkanı</p>
          <h1>
            Müalicəyə fokuslanın.
            <br />
            Axını sistem idarə etsin.
          </h1>
          <p>
            Qəbuldan klinik qeydə, ödənişdən növbəti ziyarətə qədər vahid və
            aydın iş prosesi.
          </p>
        </div>
        <small>LovelyDent Clinical Workspace · v0.3</small>
      </section>
      <section className="ws-login-form-wrap">
        <form className="ws-login-form" onSubmit={submit}>
          <header>
            <p className="ws-eyebrow">Əməkdaş girişi</p>
            <h2>İş gününə davam et</h2>
            <span>Klinika hesabınızla daxil olun.</span>
          </header>
          <label>
            E-poçt
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Şifrə
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="ws-alert ws-alert--danger">{error}</div>}
          <button className="ws-button ws-button--primary" disabled={loading}>
            {loading ? "Yoxlanılır..." : "Daxil ol"}
          </button>
          <p className="ws-login-help">
            Giriş problemi varsa klinika administratoruna müraciət edin.
          </p>
        </form>
      </section>
    </main>
  );
}
