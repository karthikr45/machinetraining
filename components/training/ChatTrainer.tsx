'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Loader2, Send, User as UserIcon, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { cn } from '@/lib/utils';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface HistoryResponse {
  messages: { id: string; message: string; response: string }[];
}

export interface ChatTrainerProps {
  machineId: string;
  machineName: string;
}

export function ChatTrainer({ machineId, machineName }: ChatTrainerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    apiFetch<HistoryResponse>(`/api/chat/${machineId}`)
      .then((data) => {
        if (!active) return;
        const bubbles: ChatBubble[] = data.messages.flatMap((m) => [
          { id: `${m.id}-u`, role: 'user' as const, content: m.message },
          { id: `${m.id}-a`, role: 'assistant' as const, content: m.response },
        ]);
        setMessages(bubbles);
      })
      .catch(() => {
        /* empty history is fine */
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [machineId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userBubble: ChatBubble = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userBubble]);
    setSending(true);
    try {
      const { response } = await apiFetch<{ response: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ machineId, message: text }),
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: response },
      ]);
    } catch (e) {
      toast({
        title: 'Message failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
      setMessages((prev) => prev.filter((m) => m.id !== userBubble.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Card className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="ml-auto h-12 w-2/3" />
            <Skeleton className="h-20 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 text-pharma-teal" />
            <p className="text-sm font-medium">Ask the {machineName} AI trainer</p>
            <p className="max-w-xs text-xs">
              Ask about startup, in-process checks, deviations, or GMP requirements. Answers
              follow the SOP — always confirm with your supervisor when unsure.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' ? (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pharma-teal/15 text-pharma-teal">
                  <Bot className="h-4 w-4" />
                </div>
              ) : null}
              <div
                className={cn(
                  'max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm',
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-muted text-slate-800'
                )}
              >
                {m.content}
              </div>
              {m.role === 'user' ? (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <UserIcon className="h-4 w-4" />
                </div>
              ) : null}
            </motion.div>
          ))
        )}

        {sending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pharma-teal/15 text-pharma-teal">
              <Bot className="h-4 w-4" />
            </div>
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        ) : null}
      </div>

      <CardContent className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about the ${machineName}…`}
            rows={1}
            className="max-h-32 min-h-[44px] resize-none"
          />
          <Button
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            size="icon"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
