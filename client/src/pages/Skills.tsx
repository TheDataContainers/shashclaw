import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Puzzle, Plus, Search, CheckCircle, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Skills() {
  const { user } = useAuth();
  const { data: skills, isLoading } = trpc.skill.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  const createMutation = trpc.skill.create.useMutation({
    onSuccess: () => {
      utils.skill.list.invalidate();
      setOpen(false);
      setName(""); setSlug(""); setDescription(""); setCategory("general");
      toast.success("Skill created");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = skills?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage agent capabilities and tools.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Skill</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Skill</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Web Scraper" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="web-scraper" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this skill do?" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["general", "data", "web", "file", "communication", "security", "ai"].map(c => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!name.trim() || !slug.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate({ name, slug, description, category })}
                >
                  {createMutation.isPending ? "Creating..." : "Create Skill"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No skills found</p>
          <p className="text-sm mt-1">Skills can be created by admins or installed from the marketplace.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(skill => (
            <Card key={skill.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Puzzle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{skill.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {skill.isVerified && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                        {skill.isBuiltIn && <Shield className="h-3 w-3 text-blue-500" />}
                        <span className="text-xs text-muted-foreground">v{skill.version}</span>
                      </div>
                    </div>
                  </div>
                  {skill.category && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{skill.category}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{skill.description || "No description"}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{skill.author || "Unknown author"}</span>
                  <span>{skill.installCount ?? 0} installs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
