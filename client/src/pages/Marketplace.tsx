import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Search, CheckCircle, Shield, Download, Puzzle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Marketplace() {
  const { data: skills, isLoading } = trpc.skill.list.useQuery();
  const { data: agents } = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [targetAgentId, setTargetAgentId] = useState<string>("");

  const installMutation = trpc.skill.install.useMutation({
    onSuccess: () => {
      utils.skill.list.invalidate();
      setSelectedSkill(null);
      setTargetAgentId("");
      toast.success("Skill installed successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = skills?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skill Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and install pre-built agent capabilities with security vetting.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search marketplace..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}><CardContent className="p-5 h-40 animate-pulse bg-muted/20" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No skills in marketplace</p>
          <p className="text-sm mt-1">Skills will appear here once they are published.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(skill => (
            <Card key={skill.id} className="hover:border-primary/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Puzzle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{skill.name}</p>
                      {skill.isVerified && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      {skill.isBuiltIn && <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{skill.author || "Unknown"} &middot; v{skill.version}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{skill.description || "No description available."}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {skill.category && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{skill.category}</span>}
                    <span className="text-xs text-muted-foreground">{skill.installCount ?? 0} installs</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSelectedSkill(skill)}>
                    <Download className="h-3 w-3" /> Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSkill} onOpenChange={(o) => { if (!o) setSelectedSkill(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install "{selectedSkill?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{selectedSkill?.description}</p>
            {selectedSkill?.permissions && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-500 mb-1">Required Permissions</p>
                <p className="text-xs text-muted-foreground">{JSON.stringify(selectedSkill.permissions)}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Select target agent</p>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                <SelectContent>
                  {agents?.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!targetAgentId || installMutation.isPending}
              onClick={() => {
                if (selectedSkill && targetAgentId) {
                  installMutation.mutate({ agentId: Number(targetAgentId), skillId: selectedSkill.id });
                }
              }}
            >
              {installMutation.isPending ? "Installing..." : "Install Skill"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
