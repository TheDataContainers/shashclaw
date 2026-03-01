import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Puzzle, Clock, FileText, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: agents } = trpc.agent.list.useQuery();
  const { data: logs } = trpc.audit.list.useQuery({ limit: 5 });
  const [, setLocation] = useLocation();

  const statCards = [
    { label: "Total Agents", value: stats?.totalAgents ?? 0, icon: Bot, color: "text-blue-500", path: "/agents" },
    { label: "Running", value: stats?.runningAgents ?? 0, icon: Activity, color: "text-emerald-500", path: "/agents" },
    { label: "Skills Available", value: stats?.totalSkills ?? 0, icon: Puzzle, color: "text-violet-500", path: "/skills" },
    { label: "Scheduled Tasks", value: stats?.totalTasks ?? 0, icon: Clock, color: "text-amber-500", path: "/tasks" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your agent platform.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card
            key={i}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => setLocation(s.path)}
          >
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Agents</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/agents")} className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!agents || agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No agents yet. Create your first agent.
              </div>
            ) : (
              <div className="space-y-2">
                {agents.slice(0, 5).map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/agents/${agent.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.description || "No description"}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      agent.status === "running" ? "bg-emerald-500/10 text-emerald-500" :
                      agent.status === "error" ? "bg-destructive/10 text-destructive" :
                      agent.status === "stopped" ? "bg-amber-500/10 text-amber-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/audit")} className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No activity yet.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      log.severity === "error" || log.severity === "critical" ? "bg-destructive" :
                      log.severity === "warning" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{log.category}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
