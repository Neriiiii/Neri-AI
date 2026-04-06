import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Square, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageBubble } from "@/components/MessageBubble";
import { useChat } from "@/hooks/useChat";
import type { Conversation } from "@/types";
import girlWithLaptop from "@/assets/girl-with-laptop.png";

interface ChatPanelProps {
  conversation: Conversation;
  model: string;
  temperature: number;
  onConversationUpdate: (conv: Conversation) => void;
}

export function ChatPanel({
  conversation,
  model,
  temperature,
  onConversationUpdate,
}: ChatPanelProps) {
  const {
    messages,
    isStreaming,
    sendMessage,
    stopGeneration,
    regenerateLast,
    syncMessages,
  } = useChat({ conversation, model, temperature, onConversationUpdate });

  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    conversation.systemPrompt ?? "",
  );
  const [showSystem, setShowSystem] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync messages when conversation prop changes (sidebar nav).
  // systemPrompt is already initialised from conversation.systemPrompt in useState
  // and the component remounts (key={activeId}) when the conversation changes,
  // so no need to call setSystemPrompt here.
  useEffect(() => {
    syncMessages(conversation.messages);
  }, [conversation.id, syncMessages, conversation.messages]);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setAutoScroll(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    void sendMessage(text, systemPrompt || undefined);
  }, [input, isStreaming, sendMessage, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <img
              src={girlWithLaptop}
              alt="Neri AI"
              className="h-20 w-20 rounded-full object-cover"
            />
            <h2 className="text-xl font-semibold">Neri AI</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Running on <strong>{model}</strong> via Ollama. Fully offline,
              zero cost.
            </p>
            <p className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs">
                Enter
              </kbd>{" "}
              to send ·{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border font-mono text-xs">
                Shift+Enter
              </kbd>{" "}
              for new line
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
                onRegenerate={() =>
                  void regenerateLast(systemPrompt || undefined)
                }
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Chat input box — Claude-style */}
          <div className="rounded-xl border border-border bg-background shadow-sm">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Message your local AI… (Enter to send)"
              className="w-full min-h-[56px] max-h-40 px-4 py-3 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent"
              disabled={isStreaming}
            />
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setShowSystem(true)}
                title="System prompt"
              >
                <FileText className="h-4 w-4" />
              </Button>
              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={stopGeneration}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Responses generated locally by {model} · No data leaves your machine
          </p>
        </div>
      </div>

      {/* System prompt modal */}
      <Dialog open={showSystem} onOpenChange={setShowSystem}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>System Prompt</DialogTitle>
          </DialogHeader>
          <Textarea
            className="text-xs min-h-[120px] max-h-64"
            placeholder="You are a helpful assistant…"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowSystem(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
