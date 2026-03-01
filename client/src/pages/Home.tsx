import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Shield, Bot, Lock, Activity, Puzzle, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (!loading && user) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">Shashclaw</span>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="sm"
          >
            Sign in
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
            <Lock className="h-3.5 w-3.5" />
            Secure by Design
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Secure AI Agent
            <br />
            <span className="text-primary">Execution Platform</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy, manage, and monitor AI agents in isolated containers with comprehensive audit logging,
            skill management, and real-time monitoring. Inspired by OpenClaw, built with NanoClaw's security principles.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="gap-2"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View Features
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Platform Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to run AI agents safely in production.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Bot, title: "Multi-Agent Support", desc: "Deploy multiple agents with isolated workspaces, persistent memory, and per-agent configuration." },
              { icon: Lock, title: "Container Isolation", desc: "Each agent runs in a sandboxed environment with explicit directory mounting and permission controls." },
              { icon: Activity, title: "Real-time Monitoring", desc: "Live dashboard with WebSocket updates, audit logs, and execution progress tracking." },
              { icon: Puzzle, title: "Skill Management", desc: "Install, configure, and manage agent skills with sandboxed execution and security vetting." },
              { icon: Clock, title: "Scheduled Tasks", desc: "Automate agent jobs with cron expressions, interval-based scheduling, and one-time execution." },
              { icon: Shield, title: "Security First", desc: "OAuth integrations, scoped permissions, comprehensive audit trails, and owner notifications." },
            ].map((feature, i) => (
              <div key={i} className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Shashclaw</span>
          </div>
          <p className="text-xs text-muted-foreground">Secure AI Agent Platform</p>
        </div>
      </footer>
    </div>
  );
}
