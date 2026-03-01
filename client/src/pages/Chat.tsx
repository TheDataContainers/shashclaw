import { trpc } from "@/lib/trpc";
import { AIChatBox, Message as ChatMessage } from "@/components/AIChatBox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MessageSquare } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Chat({ agentId }: { agentId?: number }) {
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(agentId ?? null);

  const { data: history, isLoading: historyLoading } = trpc.chat.history.useQuery(
    { agentId: selectedAgentId!, limit: 50 },
    { enabled: !!selectedAgentId }
  );

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  const historyMessages = useMemo(() => {
    if (!history) return [];
    return [...history].reverse().map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));
  }, [history]);

  useEffect(() => {
    setLocalMessages(historyMessages);
  }, [historyMessages]);

  useEffect(() => {
    if (agentId && agents) {
      setSelectedAgentId(agentId);
    }
  }, [agentId, agents]);

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (response) => {
      setLocalMessages(prev => [...prev, { role: response.role, content: response.content }]);
    },
    onError: (error) => {
      setLocalMessages(prev => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
    },
  });

  const handleSend = (content: string) => {
    if (!selectedAgentId) return;
    setLocalMessages(prev => [...prev, { role: "user", content }]);
    sendMutation.mutate({ agentId: selectedAgentId, content });
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">Interact with your agents.</p>
        </div>
        <div className="w-64">
          <Select
            value={selectedAgentId?.toString() ?? ""}
            onValueChange={(v) => setSelectedAgentId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents?.map(agent => (
                <SelectItem key={agent.id} value={agent.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5" />
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAgentId ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">Select an agent to start chatting</p>
            <p className="text-sm mt-1">Choose an agent from the dropdown above.</p>
          </CardContent>
        </Card>
      ) : historyLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <AIChatBox
          messages={localMessages}
          onSendMessage={handleSend}
          isLoading={sendMutation.isPending}
          placeholder={`Message ${selectedAgent?.name || "agent"}...`}
          height="calc(100vh - 12rem)"
          emptyStateMessage={`Start a conversation with ${selectedAgent?.name || "your agent"}`}
          suggestedPrompts={[
            "What can you help me with?",
            "List your available skills",
            "Run a quick system check",
          ]}
        />
      )}
    </div>
  );
}
