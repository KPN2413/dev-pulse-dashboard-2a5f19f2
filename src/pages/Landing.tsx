import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Activity, ArrowRight, BarChart3, Clock, GitPullRequest, Rocket, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: GitPullRequest, title: "PR Cycle Time", desc: "Track how long pull requests take from open to merge." },
  { icon: Clock, title: "Review Turnaround", desc: "Measure code review response times across your team." },
  { icon: BarChart3, title: "Commit Activity", desc: "Visualize commit frequency and contributor patterns." },
  { icon: Rocket, title: "Deployment Frequency", desc: "Monitor how often your team ships to production." },
  { icon: Users, title: "Team Analytics", desc: "Individual contributor stats and team health metrics." },
  { icon: Zap, title: "Trend Analysis", desc: "7/30/90-day trend views for all engineering metrics." },
];

const steps = [
  { step: "1", title: "Connect Repositories", desc: "Add your GitHub repos and configure webhooks." },
  { step: "2", title: "Ingest Events", desc: "DevPulse processes PRs, commits, reviews, and deployments." },
  { step: "3", title: "Analyze Metrics", desc: "View dashboards, trends, and team performance insights." },
];

export default function LandingPage() {
  const { isAuthenticated, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemo = async () => {
    try {
      await loginAsDemo();
      navigate("/dashboard");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DevPulse</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>Sign In</Button>
                <Button onClick={() => navigate("/register")}>Create Account</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Engineering metrics that matter
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Ship faster with
            <span className="gradient-text"> real engineering insights</span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground max-w-2xl mx-auto">
            DevPulse connects to your GitHub repositories and surfaces the metrics that help engineering teams understand their delivery performance — cycle time, review speed, deployment frequency, and more.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/register")}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleDemo}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to measure engineering health</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Track the DORA metrics and team signals that predict delivery performance.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="glass-card rounded-xl p-6 animate-fade-in">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 container">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground">Three steps to engineering visibility.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {steps.map(s => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                {s.step}
              </div>
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to improve your team's delivery?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Start with our demo to see what DevPulse can do, or create an account to connect your repos.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/register")}>
              Create Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleDemo}>
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>DevPulse © {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Engineering metrics for teams that ship.</p>
        </div>
      </footer>
    </div>
  );
}
