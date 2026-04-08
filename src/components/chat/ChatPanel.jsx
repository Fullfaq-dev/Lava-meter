import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  // Load history each time the panel opens
  useEffect(() => {
    if (open && user?.id) {
      loadHistory();
    }
  }, [open, user?.id]);

  // Scroll to bottom on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(
        data.map((m, i) => ({
          id: `h-${i}-${m.created_at}`,
          role: m.role,
          content: m.content,
        }))
      );
    }
    setHistoryLoading(false);
  };

  const clearHistory = async () => {
    if (!user?.id) return;
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
  };

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setIsStreaming(true);

      // Persist user message
      if (user?.id) {
        supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content: trimmed });
      }

      // Placeholder for the streaming assistant reply
      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      try {
        abortRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map(({ role, content }) => ({ role, content })),
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) throw new Error(`Server error ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
          );
        }

        // Persist assistant message
        if (user?.id && fullText) {
          supabase
            .from('chat_messages')
            .insert({ user_id: user.id, role: 'assistant', content: fullText });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Ошибка при получении ответа. Попробуйте снова.' }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, user]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating action button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-200"
        size="icon"
        aria-label="Открыть ИИ-ассистент"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 flex flex-col bg-background/96 backdrop-blur-2xl border-l border-white/10 gap-0 [&>button]:text-muted-foreground"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-sm font-semibold leading-tight">
                    ИИ Ассистент
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {user?.username ? `Сессия: ${user.username}` : 'Система мониторинга «Лава»'}
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive mr-7"
                  onClick={clearHistory}
                  title="Очистить историю"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 pb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground/70">Чем могу помочь?</p>
                  <p className="text-xs opacity-60 leading-relaxed">
                    Задайте вопрос по показаниям счётчиков,
                    <br />
                    потреблению энергии или производству.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                  {[
                    'Какой счётчик потребляет больше всего?',
                    'Объясни расчёт доли фрикулера',
                    'Что такое удельный расход?',
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => sendMessage(hint)}
                      className="text-xs text-left px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-white/5 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex gap-2 items-start',
                      m.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        m.role === 'user'
                          ? 'bg-primary/20'
                          : 'bg-muted border border-white/10'
                      )}
                    >
                      {m.role === 'user' ? (
                        <User className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      )}
                    >
                      {m.content || (
                        <span className="flex gap-1 items-center py-0.5">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={onSubmit}
            className="px-4 py-3 border-t border-white/10 flex gap-2 items-end flex-shrink-0"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите об энергопотреблении..."
              className="resize-none min-h-[40px] max-h-[120px] text-sm bg-muted/40 border-white/10 focus-visible:ring-primary/40 leading-relaxed"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isStreaming || !input.trim()}
              className="flex-shrink-0 h-10 w-10"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
