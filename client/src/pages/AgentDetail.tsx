import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Play, Square, ArrowLeft, Save, MessageSquare, Puzzle, FileText, FolderOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentDetail({ id }: { id: number }) {
  const { data: agent, isLoading } = trpc.agent.getById.useQuery({ id });
  const { data: agentSkills } = trpc.skill.agentSkills.useQuery({ agentId: id });
  const { data: files } = trpc.file.list.useQuery({ agentId: id });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [mountedDirs, setMountedDirs] = useState("");

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setSystemPrompt(agent.systemPrompt || "");
      setMemoryEnabled(agent.memoryEnabled ?? true);
      setMountedDirs(agent.mountedDirs ? JSON.stringify(agent.mountedDirs, null, 2) : "[]");
    }
  }, [agent]);

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => { utils.agent.getById.invalidate({ id }); toast.success("Agent updated"); },
    onError: (e) => toast.error(e.message),
  });

  const startMutation = trpc.agent.start.useMutation({
    onSuccess: () => { utils.agent.getById.invalidate({ id }); toast.success("Agent started"); },
  });

  const stopMutation = trpc.agent.stop.useMutation({
    onSuccess: () => { utils.agent.getById.invalidate({ id }); toast.success("Agent stopped"); },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Agent not found.</p>
        <Button variant="link" onClick={() => setLocation("/agents")}>Back to agents</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/agents")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              agent.status === "running" ? "bg-emerald-500/10 text-emerald-500" :
              agent.status === "error" ? "bg-destructive/10 text-destructive" :
              agent.status === "stopped" ? "bg-amber-500/10 text-amber-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {agent.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{agent.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLocation(`/chat/${agent.id}`)}>
            <MessageSquare className="h-4 w-4" /> Chat
          </Button>
          {agent.status !== "running" ? (
            <Button size="sm" className="gap-1.5" onClick={() => startMutation.mutate({ id })}>
              <Play className="h-4 w-4" /> Start
            </Button>
          ) : (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => stopMutation.mutate({ id })}>
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="skills">Skills ({agentSkills?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="isolation">Isolation</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={6} className="font-mono text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Memory Persistence</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Enable persistent memory across sessions</p>
                </div>
                <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
              </div>
              <Button
                className="gap-1.5"
                onClick={() => updateMutation.mutate({ id, name, description, systemPrompt, memoryEnabled })}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Installed Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {!agentSkills || agentSkills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Puzzle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No skills installed. Visit the Marketplace to add skills.</p>
                  <Button variant="link" size="sm" onClick={() => setLocation("/marketplace")}>Browse Marketplace</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {agentSkills.map((as) => (
                    <div key={as.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Puzzle className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Skill #{as.skillId}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${as.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        {as.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Files & Artifacts</CardTitle>
            </CardHeader>
            <CardContent>
              {!files || files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No files yet. Files generated by this agent will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors">
                            {file.fileName}
                          </a>
                          <p className="text-xs text-muted-foreground">{file.mimeType} &middot; {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : "Unknown size"}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{file.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="isolation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Container Isolation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mounted Directories (JSON)</Label>
                <p className="text-xs text-muted-foreground">Specify directories the agent can access. Each entry should have a path and read/write permission.</p>
                <Textarea
                  value={mountedDirs}
                  onChange={e => setMountedDirs(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder='[{"path": "/data/shared", "mode": "read"}]'
                />
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">Security Notice</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only mount directories that the agent explicitly needs. Avoid mounting sensitive system directories.
                      Each agent runs in an isolated container with no access to host filesystem by default.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                className="gap-1.5"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(mountedDirs);
                    updateMutation.mutate({ id, mountedDirs: parsed });
                  } catch { toast.error("Invalid JSON"); }
                }}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" /> Save Isolation Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
