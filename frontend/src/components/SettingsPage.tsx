import { useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BenchmarkPanel } from "@/components/BenchmarkPanel";
import { StructuredPanel } from "@/components/StructuredPanel";
import { useAuth } from "@/context/AuthContext";

function BentoCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-5 pt-4 pb-3">
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

function AccountCard() {
  const { username, changePassword, changeUsername } = useAuth();
  const [newUsername, setNewUsername] = useState("");
  const [unameStatus, setUnameStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [unameMsg, setUnameMsg] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [pwMsg, setPwMsg] = useState("");

  const handleUsernameChange = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUnameStatus("error");
      setUnameMsg("Cannot be empty.");
      return;
    }
    changeUsername(trimmed);
    setUnameStatus("success");
    setUnameMsg("Updated.");
    setNewUsername("");
  };

  const handlePasswordChange = async (
    e: React.SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setPwStatus("idle");
    if (newPw.length < 4) {
      setPwStatus("error");
      setPwMsg("Min 4 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus("error");
      setPwMsg("Passwords do not match.");
      return;
    }
    const ok = await changePassword(oldPw, newPw);
    if (ok) {
      setPwStatus("success");
      setPwMsg("Password changed.");
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } else {
      setPwStatus("error");
      setPwMsg("Current password is incorrect.");
    }
  };

  return (
    <>
      <CardHeader title="Account" />
      <Separator />
      {/* Identity row */}
      <div className="px-5 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-foreground uppercase">
            {username ? username.charAt(0) : "?"}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">
            {username || (
              <span className="text-muted-foreground italic">No username</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">Local account</p>
        </div>
      </div>
      <Separator />
      {/* Username inline */}
      <form onSubmit={handleUsernameChange} className="px-5 py-3">
        <p className="text-xs text-muted-foreground mb-2">Username</p>
        <div className="flex gap-2 items-center">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username"
            className="h-8 text-xs flex-1"
          />
          <Button type="submit" size="sm" className="shrink-0">
            Update
          </Button>
        </div>
        {unameMsg && (
          <p
            className={`text-xs mt-1.5 ${unameStatus === "success" ? "text-green-500" : "text-destructive"}`}
          >
            {unameMsg}
          </p>
        )}
      </form>
      <Separator />
      {/* Password inline */}
      <form onSubmit={handlePasswordChange} className="px-5 py-3">
        <p className="text-xs text-muted-foreground mb-2">Password</p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <Input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Current password"
              className="h-8 text-xs"
              required
            />
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="h-8 text-xs"
              required
            />
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              className="h-8 text-xs"
              required
            />
          </div>
          <Button type="submit" size="sm" className="shrink-0 self-end">
            Change
          </Button>
        </div>
        {pwMsg && (
          <p
            className={`text-xs mt-1.5 ${pwStatus === "success" ? "text-green-500" : "text-destructive"}`}
          >
            {pwMsg}
          </p>
        )}
      </form>
    </>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-semibold">Appearance</p>
          <p className="text-xs text-muted-foreground">
            {isDark ? "Dark" : "Light"} mode
          </p>
        </div>
      </div>
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDark ? "bg-primary" : "bg-muted-foreground/30"}`}
        role="switch"
        aria-checked={isDark}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const model = "llama3.2";
  const temperature = 0.7;

  return (
    <div className="flex-1 overflow-y-auto bg-background justify-center px-6 py-8">
      <div className="max-w-screen-lg w-full mx-auto">
        <h1 className="text-lg font-semibold mb-6">Settings</h1>

        <div className="flex flex-col  gap-4">
          {/* Appearance */}
          <BentoCard>
            <ThemeCard />
          </BentoCard>

          {/* Account */}
          <BentoCard>
            <AccountCard />
          </BentoCard>

          {/* Benchmark */}
          <BentoCard>
            <CardHeader
              title="Benchmark"
              description="Measure inference speed, latency, and tokens per second."
            />
            <Separator />
            <BenchmarkPanel model={model} temperature={temperature} />
          </BentoCard>

          {/* Structured Output */}
          <BentoCard>
            <CardHeader
              title="Structured Output"
              description="Test Pydantic-validated JSON generation with retry logic."
            />
            <Separator />
            <StructuredPanel model={model} temperature={temperature} />
          </BentoCard>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
