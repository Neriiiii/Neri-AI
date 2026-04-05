import { useState, type FormEvent } from "react";
import { Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import girlWithLaptop from "@/assets/girl-with-laptop.png";

export function LoginPage() {
  const { hasCredentials, login, setup } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!hasCredentials) {
      if (username.trim().length < 2) {
        setError("Username must be at least 2 characters.");
        setLoading(false);
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters.");
        setLoading(false);
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      await setup(username.trim(), password);
    } else {
      const ok = await login(password);
      if (!ok) {
        setError("Incorrect password.");
        setPassword("");
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <img
              src={girlWithLaptop}
              alt="Neri AI"
              className="h-12 w-12 rounded-full object-cover"
            />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Neri AI
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasCredentials
              ? "Enter your password to continue."
              : "Create an account to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (setup only) */}
          {!hasCredentials && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="pl-9"
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  hasCredentials ? "Enter your password" : "Choose a password"
                }
                className="pl-9 pr-9"
                autoFocus={hasCredentials}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password (setup only) */}
          {!hasCredentials && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-9 pr-9"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait…"
              : hasCredentials
                ? "Unlock"
                : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground">
          Fully offline · No data leaves your machine
        </p>
      </div>
    </div>
  );
}
