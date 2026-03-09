import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Plus, Play, Square, Trash2, Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function Agents() {
  const { data: agents, isLoading } = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [llmConfigId, setLlmConfigId] = useState<string>("default");

  const { data: llmConfigs } = trpc.llm.list.useQuery();

  const createMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setName("");
      setDescription("");
      setSystemPrompt("");
      setLlmConfigId("default");
      toast.success("Agent created");
    },
    onError: (e) => toast.error(e.message),
  });

  const startMutation = trpc.agent.start.useMutation({
    onSuccess: () => { utils.agent.list.invalidate(); toast.success("Agent started"); },
  });

  const stopMutation = trpc.agent.stop.useMutation({
    onSuccess: () => { utils.agent.list.invalidate(); toast.success("Agent stopped"); },
  });

  const deleteMutation = trpc.agent.delete.useMutation({
    onSuccess: () => { utils.agent.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Agent deleted"); },
  });

  const filtered = agents?.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.description || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your AI agents.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Agent" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" />
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are a helpful assistant..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>LLM Config</Label>
                <Select value={llmConfigId} onValueChange={setLlmConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default (Claude Sonnet)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Claude Sonnet)</SelectItem>
                    {llmConfigs?.map(c => (
                      <SelectItem key={c.id} value={`config:${c.id}`}>
                        {c.name} — {c.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name, description, systemPrompt,
                  llmProvider: llmConfigId === "default" ? undefined : llmConfigId
                })}
              >
                {createMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No agents found</p>
          <p className="text-sm mt-1">Create your first agent to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <Card
              key={agent.id}
              className="hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => setLocation(`/agents/${agent.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        agent.status === "running" ? "bg-emerald-500/10 text-emerald-500" :
                        agent.status === "error" ? "bg-destructive/10 text-destructive" :
                        agent.status === "stopped" ? "bg-amber-500/10 text-amber-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                  {agent.description || "No description"}
                </p>
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {agent.status !== "running" ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => startMutation.mutate({ id: agent.id })}>
                      <Play className="h-3 w-3" /> Start
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => stopMutation.mutate({ id: agent.id })}>
                      <Square className="h-3 w-3" /> Stop
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLocation(`/chat/${agent.id}`)}>
                    <MessageSquare className="h-3 w-3" /> Chat
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
                    onClick={() => { if (confirm("Delete this agent?")) deleteMutation.mutate({ id: agent.id }); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
