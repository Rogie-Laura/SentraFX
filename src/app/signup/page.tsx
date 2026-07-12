"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      router.push("/dashboard");
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
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
          <h1 className="text-xl font-bold">Create Account</h1>
          <p className="text-sm text-[#6b7a8f]">Start with paper trading</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6b7a8f]">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-[#1e2836] bg-[#0b0f14] px-3 py-2 text-sm outline-none focus:border-[#00d4aa]"
            />
          </div>
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
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-[#ff4757]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#00d4aa] py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#6b7a8f]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#00d4aa] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
