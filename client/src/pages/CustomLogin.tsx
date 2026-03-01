import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CustomLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "verify">("email");
  const [tempToken, setTempToken] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Login request failed");
      }

      const data = await response.json();
      setTempToken(data.tempToken);
      setStep("verify");
      toast.success("Verification token generated");
    } catch (error) {
      toast.error("Failed to send login link");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) {
      toast.error("Please enter the verification token");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          email,
          name: name || email.split("@")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      toast.success("Logged in successfully");
      setLocation("/dashboard");
    } catch (error) {
      toast.error("Verification failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      window.location.href = `/api/auth/demo-login?email=demo@shashclaw.local&name=Demo User`;
    } catch (error) {
      toast.error("Demo login failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Shashclaw</span>
          </div>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your email to get started" 
              : "Enter the verification token sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name (optional)
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Continue with Email"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Try Demo Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  A verification token has been generated for <strong>{email}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="token" className="text-sm font-medium">
                  Verification Token
                </label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Paste your verification token"
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  disabled={loading}
                  className="bg-background/50 font-mono text-xs"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setTempToken("");
                }}
                disabled={loading}
              >
                Back to Email
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            By signing in, you agree to our Terms of Service
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
