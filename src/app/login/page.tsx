"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      router.push("/dashboard");
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00d4aa20] text-lg font-bold text-[#00d4aa]">
            SF
          </div>
          <h1 className="text-xl font-bold">SENTRA FX</h1>
          <p className="text-sm text-[#6b7a8f]">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6b7a8f]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#1e2836] bg-[#0b0f14] px-3 py-2 text-sm outline-none focus:border-[#00d4aa]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#6b7a8f]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#1e2836] bg-[#0b0f14] px-3 py-2 text-sm outline-none focus:border-[#00d4aa]"
              required
            />
          </div>

          {error && <p className="text-sm text-[#ff4757]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#00d4aa] py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#6b7a8f]">
          No account?{" "}
          <Link href="/signup" className="text-[#00d4aa] hover:underline">
            Sign up
          </Link>
        </p>

        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <p className="mt-4 rounded-lg bg-[#ffa50215] p-3 text-xs text-[#ffa502]">
            Supabase not configured — click Sign In to enter demo mode.
          </p>
        )}
      </div>
    </div>
  );
}
