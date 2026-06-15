import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { daysUntil } from "@/lib/expiry";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Suggest a vegetarian dinner for two.",
  "What's a quick gluten-free breakfast?",
  "Give me a cozy Italian comfort dish.",
  "I want a light Thai lunch — what should I make?",
];

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your kitchen helper. Tell me what you're in the mood for — a cuisine, meal type, dietary need, or anything specific — and I'll suggest a recipe. 🌿",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data: pantryRows } = await supabase
        .from("pantry_items")
        .select("name, expiry_date")
        .order("expiry_date", { ascending: true })
        .limit(25);
      const pantry = (pantryRows ?? []).map((p) => ({
        name: p.name,
        daysUntilExpiry: daysUntil(p.expiry_date),
      }));
      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: { messages: next, pantry },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; error?: string })?.reply;
      if (!reply) throw new Error((data as { error?: string })?.error || "No reply");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      toast.error(msg);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — something went wrong. Mind trying again?" },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <header className="space-y-2">
        <p className="font-hand text-2xl text-accent leading-none">A friendly kitchen chat</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
              <MessageCircle className="h-7 w-7 text-primary" /> Ask for a recipe
            </h1>
            <p className="text-sm text-muted-foreground italic mt-1">
              Dietary restrictions, cuisine, meal type — just ask.
            </p>
          </div>
        </div>
        <hr className="rule-divider" />
      </header>

      <Card className="paper-card p-0 overflow-hidden flex flex-col h-[60vh] min-h-[420px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2 bg-primary text-primary-foreground shadow-soft"
                    : "max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2 bg-secondary text-foreground border border-border/60"
                }
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm px-4 py-2 bg-secondary border border-border/60 text-muted-foreground text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary-soft text-primary border border-primary/30 hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3 w-3 inline mr-1" /> {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border/60 p-3 flex gap-2 items-end bg-card"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="e.g. vegan dinner with pasta, ~30 min…"
            rows={1}
            className="resize-none min-h-[44px] max-h-32"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Chat;
