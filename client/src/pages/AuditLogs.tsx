import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["all", "agent", "skill", "auth", "system", "task", "file"] as const;
const severities = ["all", "info", "warning", "error", "critical"] as const;

export default function AuditLogs() {
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const { data: logs, isLoading } = trpc.audit.list.useQuery(
    { category: category === "all" ? undefined : category, limit: 200 }
  );

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (severity === "all") return logs;
    return logs.filter(l => l.severity === severity);
  }, [logs, severity]);

  const severityIcon = (s: string) => {
    switch (s) {
      case "critical": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case "error": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "warning": return <Zap className="h-3.5 w-3.5 text-amber-500" />;
      default: return <Info className="h-3.5 w-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Comprehensive activity trail for all agent actions.</p>
      </div>

      <div className="flex gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {severities.map(s => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Severities" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Activity will appear here as agents perform actions.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30">
                <span className="w-5"></span>
                <span>Action</span>
                <span className="w-20 text-center">Category</span>
                <span className="w-16 text-center">Severity</span>
                <span className="w-36 text-right">Timestamp</span>
              </div>
              {filtered.map(log => (
                <div key={log.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-accent/30 transition-colors text-sm">
                  <span className="w-5">{severityIcon(log.severity)}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{log.action}</p>
                    {log.details != null && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {String(typeof log.details === "string" ? log.details : JSON.stringify(log.details))}
                      </p>
                    )}
                  </div>
                  <span className="w-20 text-center text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{log.category}</span>
                  <span className={`w-16 text-center text-xs px-2 py-0.5 rounded font-medium ${
                    log.severity === "critical" ? "bg-red-500/10 text-red-500" :
                    log.severity === "error" ? "bg-destructive/10 text-destructive" :
                    log.severity === "warning" ? "bg-amber-500/10 text-amber-500" :
                    "bg-blue-500/10 text-blue-500"
                  }`}>{log.severity}</span>
                  <span className="w-36 text-right text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
