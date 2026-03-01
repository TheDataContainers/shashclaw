import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Trash2, Play, Pause } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduledTasks() {
  const { data: tasks, isLoading } = trpc.task.list.useQuery();
  const { data: agents } = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [taskType, setTaskType] = useState<"cron" | "interval" | "once">("cron");
  const [cronExpression, setCronExpression] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState("");
  const [prompt, setPrompt] = useState("");

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setName(""); setDescription(""); setAgentId(""); setCronExpression(""); setIntervalSeconds(""); setPrompt("");
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => { utils.task.list.invalidate(); toast.success("Task updated"); },
  });

  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => { utils.task.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Task deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduled Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate agent jobs with cron or interval scheduling.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Scheduled Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Task Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Daily Report" />
              </div>
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select value={taskType} onValueChange={(v) => setTaskType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cron">Cron Expression</SelectItem>
                    <SelectItem value="interval">Fixed Interval</SelectItem>
                    <SelectItem value="once">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taskType === "cron" && (
                <div className="space-y-2">
                  <Label>Cron Expression</Label>
                  <Input value={cronExpression} onChange={e => setCronExpression(e.target.value)} placeholder="0 0 9 * * 1-5" className="font-mono" />
                  <p className="text-xs text-muted-foreground">6-field format: sec min hour day month weekday</p>
                </div>
              )}
              {taskType === "interval" && (
                <div className="space-y-2">
                  <Label>Interval (seconds)</Label>
                  <Input type="number" value={intervalSeconds} onChange={e => setIntervalSeconds(e.target.value)} placeholder="300" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Prompt / Instructions</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Generate a daily summary report..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <Button
                className="w-full"
                disabled={!name.trim() || !agentId || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name, description, agentId: Number(agentId), taskType, prompt,
                  cronExpression: taskType === "cron" ? cronExpression : undefined,
                  intervalSeconds: taskType === "interval" ? Number(intervalSeconds) : undefined,
                })}
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No scheduled tasks</p>
          <p className="text-sm mt-1">Create a task to automate agent jobs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      task.enabled ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Clock className={`h-5 w-5 ${task.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{task.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{task.taskType}</span>
                        {task.lastStatus && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            task.lastStatus === "success" ? "bg-emerald-500/10 text-emerald-500" :
                            task.lastStatus === "failed" ? "bg-destructive/10 text-destructive" :
                            task.lastStatus === "running" ? "bg-blue-500/10 text-blue-500" :
                            "bg-muted text-muted-foreground"
                          }`}>{task.lastStatus}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {task.cronExpression ? `Cron: ${task.cronExpression}` :
                         task.intervalSeconds ? `Every ${task.intervalSeconds}s` : "One-time"}
                        {task.prompt && ` — ${task.prompt}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={task.enabled ?? true}
                      onCheckedChange={(enabled) => updateMutation.mutate({ id: task.id, enabled })}
                    />
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this task?")) deleteMutation.mutate({ id: task.id }); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
