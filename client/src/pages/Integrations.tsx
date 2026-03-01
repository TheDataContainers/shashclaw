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

export default function Integrations() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    service: "slack" as "slack" | "discord" | "github" | "webhook" | "custom",
    webhookUrl: "",
    apiKey: "",
    enabled: true,
  });

  const { data: integrations, isLoading, refetch } = trpc.service.list.useQuery();
  const createMutation = trpc.service.create.useMutation();
  const updateMutation = trpc.service.update.useMutation();
  const deleteMutation = trpc.service.delete.useMutation();
  const testMutation = trpc.service.test.useMutation();

  const handleOpenDialog = (integration?: any) => {
    if (integration) {
      setEditingId(integration.id);
      setFormData({
        name: integration.name,
        service: integration.service,
        webhookUrl: integration.webhookUrl || "",
        apiKey: "",
        enabled: integration.enabled,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        service: "slack",
        webhookUrl: "",
        apiKey: "",
        enabled: true,
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.service) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.service === "webhook" && !formData.webhookUrl) {
      toast.error("Webhook URL is required for webhook service");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Integration updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Integration created");
      }
      setIsOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save integration");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this integration?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Integration deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete integration");
    }
  };

  const handleTest = async (id: number) => {
    try {
      const result = await testMutation.mutateAsync({ id });
      if (result.success) {
        toast.success("Integration test passed");
      } else {
        toast.error(result.error || "Integration test failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Test failed");
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: Record<string, string> = {
      slack: "🔵",
      discord: "⚫",
      github: "🐙",
      webhook: "🔗",
      custom: "⚙️",
    };
    return icons[service] || "📌";
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
          <h1 className="text-3xl font-bold">Service Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect agents to external services with secure credentials</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading integrations...</div>
      ) : integrations && integrations.length > 0 ? (
        <div className="grid gap-4">
          {integrations.map((integration: any) => (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getServiceIcon(integration.service)}</span>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>
                        {integration.service.charAt(0).toUpperCase() + integration.service.slice(1)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(integration.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Service Type:</span>
                    <p className="font-medium capitalize">{integration.service}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{integration.status}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(integration.id)}
                    disabled={testMutation.isPending}
                  >
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(integration)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(integration.id)}
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
              <p className="text-muted-foreground">No integrations configured yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first integration to connect agents to external services</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Integration" : "Add Integration"}</DialogTitle>
            <DialogDescription>
              Configure a service integration with secure credential storage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Integration Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production Slack"
              />
            </div>

            <div>
              <Label htmlFor="service">Service Type</Label>
              <Select value={formData.service} onValueChange={(value: any) => setFormData({ ...formData, service: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.service === "webhook" && (
              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://example.com/webhook"
                />
              </div>
            )}

            {formData.service !== "webhook" && (
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter API key (encrypted)"
                />
                <p className="text-xs text-muted-foreground mt-1">API keys are encrypted at rest with AES-256-GCM</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <Label htmlFor="enabled">Enable this integration</Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                All credentials are encrypted with AES-256-GCM and stored securely. Access is restricted to the owner only.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Update" : "Create"} Integration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
