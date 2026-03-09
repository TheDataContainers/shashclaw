import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox, Message as ChatMessage } from "@/components/AIChatBox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Key, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DEMO_LIMIT = 5;

function DemoBanner({ promptsRemaining }: { promptsRemaining: number }) {
  const isExhausted = promptsRemaining === 0;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${isExhausted ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"}`}>
      <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${isExhausted ? "text-amber-500" : "text-blue-500"}`} />
      <div className="flex-1">
        {isExhausted ? (
          <>
            <p className="font-medium text-amber-800 dark:text-amber-200">Demo limit reached</p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              You've used all 5 free prompts. Add your own Anthropic API key to keep going — it's free to start.
            </p>
          </>
        ) : (
          <p className="text-blue-700 dark:text-blue-300">
            Demo mode — <span className="font-medium">{promptsRemaining} of {DEMO_LIMIT} prompts remaining</span>. Running on Claude Haiku.
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <a
            href="/config"
            className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2"
          >
            <Key className="h-3 w-3" /> Add API key
          </a>
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2"
          >
            Get a free key ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Chat({ agentId }: { agentId?: number }) {
  const { user } = useAuth();
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(agentId ?? null);
  const utils = trpc.useUtils();

  const { data: history, isLoading: historyLoading } = trpc.chat.history.useQuery(
    { agentId: selectedAgentId!, limit: 50 },
    { enabled: !!selectedAgentId }
  );

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const isDemo = user?.role === "demo" || user?.openId?.startsWith("demo:");
  const promptsRemaining = isDemo
    ? Math.max(0, DEMO_LIMIT - (user?.demoMessageCount ?? 0))
    : null;

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

  const handleSend = async (content: string) => {
    if (!selectedAgentId) return;
    if (isDemo && (promptsRemaining === 0 || limitReached)) return;

    setLocalMessages(prev => [...prev, { role: "user", content }]);
    setIsStreaming(true);
    // placeholder for streaming response
    setLocalMessages(prev => [...prev, { role: "assistant", content: "" }]);

    let accumulated = "";
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId, content }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        if (err.error === "DEMO_LIMIT_REACHED") {
          setLimitReached(true);
          setLocalMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: "You've reached the 5-prompt demo limit. Add your Anthropic API key in **LLM Config** to continue." };
            return updated;
          });
        } else {
          setLocalMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: `Error: ${err.error || "Unknown error"}` };
            return updated;
          });
        }
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setLocalMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: `Error: ${parsed.error}` };
                return updated;
              });
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setLocalMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {
            // skip malformed events
          }
        }
      }

      if (isDemo) utils.auth.me.invalidate();
    } catch {
      setLocalMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error: Connection failed" };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const isInputDisabled = isDemo && (promptsRemaining === 0 || limitReached);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">Interact with your agents.</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && promptsRemaining !== null && promptsRemaining > 0 && (
            <Badge variant="secondary" className="text-xs">
              {promptsRemaining} prompt{promptsRemaining !== 1 ? "s" : ""} left
            </Badge>
          )}
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
      </div>

      {isDemo && (promptsRemaining === 0 || limitReached) && (
        <DemoBanner promptsRemaining={0} />
      )}
      {isDemo && promptsRemaining !== null && promptsRemaining > 0 && promptsRemaining <= 2 && (
        <DemoBanner promptsRemaining={promptsRemaining} />
      )}

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
          isLoading={isStreaming}
          placeholder={isInputDisabled ? "Demo limit reached — add your API key to continue" : `Message ${selectedAgent?.name || "agent"}...`}
          height="calc(100vh - 12rem)"
          emptyStateMessage={`Start a conversation with ${selectedAgent?.name || "your agent"}`}
          suggestedPrompts={[
            "What can you help me with?",
            "Summarize the latest AI news",
            "Write a Python script to rename files",
          ]}
        />
      )}
    </div>
  );
}
