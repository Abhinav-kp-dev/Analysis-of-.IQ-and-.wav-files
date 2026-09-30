"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/LogoMark";
import SignalBackdrop from "@/components/SignalBackdrop";
import { useToast } from "@/components/ui/toast";
import { Loader2, Eye, EyeOff, Sparkles, Copy, Check, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const DEMO_EMAIL = "admin@signalscope.io";
const DEMO_PASSWORD = "SignalScopeAdmin123!";

export default function LoginPage() {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = React.useState(true);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const { login, register, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToast();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      router.push("/");
    } catch (err) {
      addToast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoLogin = async () => {
    setIsSubmitting(true);
    try {
      loginForm.setValue("email", DEMO_EMAIL);
      loginForm.setValue("password", DEMO_PASSWORD);
      try {
        await login(DEMO_EMAIL, DEMO_PASSWORD);
      } catch {
        // If user was not yet registered in a fresh DB, register automatically then login
        await register(DEMO_EMAIL, DEMO_PASSWORD);
      }
      router.push("/");
    } catch (err) {
      addToast({
        title: "Auto-login failed",
        description: err instanceof Error ? err.message : "Failed to sign in automatically",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    addToast({
      title: "Copied to clipboard",
      description: `${field === "email" ? "Username/Email" : "Password"} copied`,
      variant: "default",
    });
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await register(data.email, data.password);
      router.push("/");
    } catch (err) {
      addToast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Registration failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <SignalBackdrop />{/* waveform traces + aurora blobs, aria-hidden */}

      <div className="w-full max-w-md space-y-8 py-12">
        {/* Hero statement */}
        <div className="space-y-3 reveal">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <div className="font-display text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                SIGIL
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                Signal Intelligence Lab
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
            {mode === "login" ? "Analyze the spectrum, not the guesswork." : "Start your analysis."}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SIGIL turns raw RF recordings into explainable parameter
            estimates — backed by transparent evidence, 3D spectral waterfalls, and live SDR simulation.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-elevation-3 reveal reveal-delay-1">
          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              {/* Auto Login Credentials Banner */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Auto-Login Demo Credentials
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAutoLogin}
                    disabled={isSubmitting}
                    className="h-7 px-3 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Auto Login
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/80 p-2">
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-muted-foreground block">Username / Email</span>
                      <span className="text-foreground font-semibold truncate block select-all">
                        {DEMO_EMAIL}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(DEMO_EMAIL, "email")}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                      title="Copy username"
                    >
                      {copiedField === "email" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/80 p-2">
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-muted-foreground block">Password</span>
                      <span className="text-foreground font-semibold truncate block select-all">
                        {showPassword ? DEMO_PASSWORD : "••••••••••••••••••••"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(DEMO_PASSWORD, "password")}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy password"
                      >
                        {copiedField === "password" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-email">Email / Username</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoLogin}
                  disabled={isSubmitting}
                  className="gap-1 border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Auto Login
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-medium text-primary hover:underline"
                >
                  Register
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm">Confirm Password</Label>
                <Input
                  id="reg-confirm"
                  type="password"
                  placeholder="••••••••"
                  {...registerForm.register("confirmPassword")}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground reveal reveal-delay-2">
          Authorized spectrum analysis only. End-to-end explainable DSP.
        </p>
      </div>
    </div>
  );
}