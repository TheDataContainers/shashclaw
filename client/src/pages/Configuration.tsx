import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cog, Key, Shield, Bell, Server } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Configuration() {
  const [llmProvider, setLlmProvider] = useState("default");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnApproval, setNotifyOnApproval] = useState(true);
  const [autoIsolation, setAutoIsolation] = useState(true);
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState("5");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide settings for LLM providers, security, and notifications.</p>
      </div>

      <Tabs defaultValue="llm">
        <TabsList>
          <TabsTrigger value="llm" className="gap-1.5"><Server className="h-3.5 w-3.5" /> LLM Providers</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LLM Provider Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Provider</Label>
                <Input value={llmProvider} onChange={e => setLlmProvider(e.target.value)} placeholder="default, openai, anthropic" />
                <p className="text-xs text-muted-foreground">The built-in provider uses the platform's preconfigured LLM. Set a custom provider to use your own API keys.</p>
              </div>
              <div className="space-y-2">
                <Label>API Key (optional)</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="pl-9 font-mono" />
                </div>
                <p className="text-xs text-muted-foreground">Only needed if using a custom LLM provider. Keys are stored securely.</p>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input type="number" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
              </div>
              <Button onClick={() => toast.success("LLM configuration saved")} className="gap-1.5">
                <Cog className="h-4 w-4" /> Save LLM Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Container Isolation</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically isolate all new agents in containers</p>
                </div>
                <Switch checked={autoIsolation} onCheckedChange={setAutoIsolation} />
              </div>
              <div className="space-y-2">
                <Label>Max Concurrent Agents</Label>
                <Input type="number" value={maxConcurrentAgents} onChange={e => setMaxConcurrentAgents(e.target.value)} className="w-32" />
                <p className="text-xs text-muted-foreground">Maximum number of agents that can run simultaneously</p>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-500">Security Model</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Shashclaw uses NanoClaw-inspired security principles: each agent runs in an isolated environment
                      with explicit directory mounting, sandboxed skill execution, and comprehensive audit logging.
                      All actions are logged and can be reviewed in the Audit Logs section.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => toast.success("Security settings saved")} className="gap-1.5">
                <Shield className="h-4 w-4" /> Save Security Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Error Notifications</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Notify when agents encounter errors</p>
                </div>
                <Switch checked={notifyOnError} onCheckedChange={setNotifyOnError} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Completion</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Notify when critical tasks complete</p>
                </div>
                <Switch checked={notifyOnComplete} onCheckedChange={setNotifyOnComplete} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Approval Requests</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Notify when agents require human approval</p>
                </div>
                <Switch checked={notifyOnApproval} onCheckedChange={setNotifyOnApproval} />
              </div>
              <Button onClick={() => toast.success("Notification preferences saved")} className="gap-1.5">
                <Bell className="h-4 w-4" /> Save Notification Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
