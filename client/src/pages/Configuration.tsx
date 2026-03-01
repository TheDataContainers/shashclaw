import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Configuration() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    provider: "openai" as "openai" | "anthropic" | "custom" | "manus",
    model: "",
    apiKey: "",
    apiUrl: "",
    temperature: "0.7",
    maxTokens: "2048",
    topP: "1.0",
    isDefault: false,
  });

  const { data: configs, isLoading, refetch } = trpc.llm.list.useQuery();
  const createMutation = trpc.llm.create.useMutation();
  const updateMutation = trpc.llm.update.useMutation();
  const deleteMutation = trpc.llm.delete.useMutation();
  const testMutation = trpc.llm.test.useMutation();

  const handleOpenDialog = (config?: any) => {
    if (config) {
      setEditingId(config.id);
      setFormData({
        name: config.name,
        provider: config.provider,
        model: config.model,
        apiKey: "",
        apiUrl: config.apiUrl || "",
        temperature: config.temperature || "0.7",
        maxTokens: config.maxTokens?.toString() || "2048",
        topP: config.topP || "1.0",
        isDefault: config.isDefault,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        provider: "openai",
        model: "",
        apiKey: "",
        apiUrl: "",
        temperature: "0.7",
        maxTokens: "2048",
        topP: "1.0",
        isDefault: false,
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.provider || !formData.model) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.provider === "custom" && !formData.apiUrl) {
      toast.error("API URL is required for custom providers");
      return;
    }

    try {
      const data: any = {
        name: formData.name,
        provider: formData.provider,
        model: formData.model,
        apiUrl: formData.apiUrl || undefined,
        temperature: parseFloat(formData.temperature),
        maxTokens: parseInt(formData.maxTokens),
        topP: parseFloat(formData.topP),
        isDefault: formData.isDefault,
      };

      if (formData.apiKey) {
        data.apiKey = formData.apiKey;
      }

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...data });
        toast.success("Configuration updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Configuration created");
      }
      setIsOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this configuration?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Configuration deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete configuration");
    }
  };

  const handleTest = async (id: number) => {
    try {
      const result = await testMutation.mutateAsync({ id });
      if (result.success) {
        toast.success("Configuration test passed");
      } else {
        toast.error(result.error || "Configuration test failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Test failed");
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      openai: "🤖",
      anthropic: "🧠",
      custom: "⚙️",
      manus: "🔷",
    };
    return icons[provider] || "📌";
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-green-600">Active</Badge>;
    } else if (status === "error") {
      return <Badge className="bg-red-600">Error</Badge>;
    }
    return <Badge className="bg-gray-600">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LLM Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure LLM providers and their parameters</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading configurations...</div>
      ) : configs && configs.length > 0 ? (
        <div className="grid gap-4">
          {configs.map((config: any) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(config.provider)}</span>
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>
                        {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)} - {config.model}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.isDefault && <Badge className="bg-blue-600">Default</Badge>}
                    {getStatusBadge(config.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Temperature:</span>
                    <p className="font-medium">{config.temperature}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Tokens:</span>
                    <p className="font-medium">{config.maxTokens}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Top P:</span>
                    <p className="font-medium">{config.topP}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{config.status}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(config.id)}
                    disabled={testMutation.isPending}
                  >
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(config)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No LLM configurations yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first configuration to enable agents to use LLMs</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Configuration" : "Add LLM Configuration"}</DialogTitle>
            <DialogDescription>
              Configure an LLM provider with secure credential storage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production GPT-4"
                />
              </div>

              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={formData.provider} onValueChange={(value: any) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="manus">Manus</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., gpt-4, claude-3-opus"
                />
              </div>

              {formData.provider === "custom" && (
                <div>
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    type="url"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    placeholder="https://api.example.com"
                  />
                </div>
              )}
            </div>

            {formData.provider !== "manus" && (
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter API key (encrypted)"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to keep existing key</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="temperature">Temperature (0-2)</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="topP">Top P (0-1)</Label>
                <Input
                  id="topP"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.topP}
                  onChange={(e) => setFormData({ ...formData, topP: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
              <Label htmlFor="isDefault">Set as default configuration</Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                API keys are encrypted with AES-256-GCM at rest. Access is restricted to the owner only.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Update" : "Create"} Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
