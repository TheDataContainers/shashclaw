import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link2, Plus, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const providerIcons: Record<string, string> = {
  github: "GH",
  openai: "AI",
  anthropic: "AN",
  slack: "SL",
  google: "GO",
  custom: "CU",
};

export default function Integrations() {
  const { data: integrations, isLoading } = trpc.integration.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [label, setLabel] = useState("");

  const createMutation = trpc.integration.create.useMutation({
    onSuccess: () => {
      utils.integration.list.invalidate();
      setOpen(false);
      setProvider(""); setLabel("");
      toast.success("Integration added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.integration.delete.useMutation({
    onSuccess: () => { utils.integration.list.invalidate(); toast.success("Integration removed"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage OAuth connections and external service integrations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Integration</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Integration</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="github, openai, slack..." />
              </div>
              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="My GitHub Account" />
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-xs text-muted-foreground">
                  OAuth tokens and credentials are stored securely. You can configure scoped permissions per integration.
                </p>
              </div>
              <Button className="w-full" disabled={!provider.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ provider, label })}
              >
                {createMutation.isPending ? "Adding..." : "Add Integration"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !integrations || integrations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No integrations</p>
          <p className="text-sm mt-1">Connect external services to enable OAuth-based agent capabilities.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {integrations.map(integration => (
            <Card key={integration.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-mono text-xs font-bold text-primary">
                      {providerIcons[integration.provider.toLowerCase()] || integration.provider.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{integration.label || integration.provider}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{integration.provider}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          integration.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                          integration.status === "expired" ? "bg-amber-500/10 text-amber-500" :
                          "bg-destructive/10 text-destructive"
                        }`}>{integration.status}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Remove this integration?")) deleteMutation.mutate({ id: integration.id }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
