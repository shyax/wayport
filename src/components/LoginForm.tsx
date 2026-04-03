import { useState } from "react";
import { Cable, GitBranch, Mail } from "lucide-react";
import { useAuthStore } from "../stores/authStore";

export function LoginForm() {
  const { signInWithEmail, signUp, signInWithOAuth, continueOffline, error } =
    useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      await signUp(email, password, displayName);
    } else {
      await signInWithEmail(email, password);
    }
    setLoading(false);
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors duration-150";

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Cable size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            Porthole
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isSignUp ? "Create your account" : "Sign in to sync your tunnels"}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => signInWithOAuth("github")}
            className="focus-ring w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm text-text-primary cursor-pointer transition-colors duration-150"
          >
            <GitBranch size={16} />
            Continue with GitHub
          </button>
          <button
            onClick={() => signInWithOAuth("google")}
            className="focus-ring w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm text-text-primary cursor-pointer transition-colors duration-150"
          >
            <Mail size={16} />
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          {isSignUp && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              className={inputClass}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className={inputClass}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className={inputClass}
          />

          {error && (
            <p className="text-xs text-status-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-full px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Toggle sign up/in */}
        <p className="text-center text-xs text-text-muted mb-4">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent hover:underline cursor-pointer"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>

        {/* Offline mode */}
        <div className="text-center">
          <button
            onClick={continueOffline}
            className="text-xs text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-150"
          >
            Continue offline (no sync)
          </button>
        </div>
      </div>
    </div>
  );
}
