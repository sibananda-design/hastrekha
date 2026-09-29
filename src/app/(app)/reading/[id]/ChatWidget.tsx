"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, SendHorizonal, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { LogoMark } from "@/components/Logo";
import { STARTER_QUESTIONS, STREAM_ERROR_MARK } from "@/lib/constants";
import type { ReadingInfo } from "./ReadingView";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function counterLabel(isFree: boolean, remaining: number, total: number) {
  if (isFree) return remaining > 0 ? "1 free question" : "Free question used";
  return `${remaining} of ${total} questions left`;
}

export function ChatWidget({ reading, initialMessages }: { reading: ReadingInfo; initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const { openPayment } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [remaining, setRemaining] = useState(reading.questionsRemaining);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const locked = remaining <= 0;
  const firstName = reading.name.split(" ")[0];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, error]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    if (!locked) setTimeout(() => inputRef.current?.focus(), 100);
    // lock background scroll for the full-screen mobile sheet
    const mq = window.matchMedia("(max-width: 639px)");
    const prev = document.body.style.overflow;
    if (mq.matches) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, locked]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || streaming || locked) return;
    if (q.length < 2) return;
    setError(null);
    setInput("");
    setStreaming(true);

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content: q };
    const botId = `a${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: botId, role: "assistant", content: "" }]);
    setRemaining((r) => r - 1);

    const rollback = (msg: string) => {
      setMessages((m) => m.filter((x) => x.id !== botId && x.id !== userMsg.id));
      setRemaining((r) => r + 1);
      setInput(q);
      setError(msg);
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingId: reading.id, message: q }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        if (json?.error?.code === "NO_QUESTIONS") {
          setMessages((m) => m.filter((x) => x.id !== botId && x.id !== userMsg.id));
          setRemaining(0);
          setInput(q);
          return;
        }
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        rollback(json?.error?.message ?? "The astrologer couldn't answer just now. Your question was not used.");
        return;
      }

      const serverRemaining = Number(res.headers.get("X-Questions-Remaining"));
      if (Number.isFinite(serverRemaining)) setRemaining(serverRemaining);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (text.includes(STREAM_ERROR_MARK)) {
          rollback("The answer was interrupted. Your question was not used — please try again.");
          return;
        }
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: text } : x)));
      }
    } catch {
      rollback("Network error — please check your connection. Your question was not used.");
    } finally {
      setStreaming(false);
    }
  }

  const hasAsked = messages.some((m) => m.role === "user");

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full border border-brass bg-maroon py-3 pl-3 pr-5 text-cream shadow-2xl transition hover:scale-105 hover:bg-maroon-hover active:scale-95 sm:bottom-6 sm:right-6"
          aria-label={`Ask the Astrologer. ${counterLabel(reading.isFree, remaining, reading.questionsTotal)}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream">
            <LogoMark className="h-7 w-7" />
          </span>
          <span className="font-semibold">Ask the Astrologer</span>
          {!locked && (
            <span className="rounded-full bg-[#f3be6a] px-2 py-0.5 text-xs font-bold text-[#3c2700]">
              {reading.isFree ? "1 free" : remaining}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-title"
          className="fixed inset-0 z-50 flex animate-sheet-up flex-col overflow-hidden bg-cream sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100vh-7rem))] sm:w-[390px] sm:rounded-2xl sm:border sm:border-brass/40 sm:shadow-2xl"
        >
          <header className="flex items-center justify-between bg-maroon px-4 py-3 text-cream">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream">
                <LogoMark className="h-8 w-8" />
              </span>
              <div>
                <p id="chat-title" className="font-semibold leading-tight">
                  Pandit AI · Astrologer
                </p>
                <p className="text-xs text-cream/75">Answers based on {firstName}&apos;s palm</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-cream/80 hover:bg-cream/10 hover:text-cream"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex items-center justify-between border-b border-line bg-blush px-4 py-2 text-sm">
            <span className="text-umber">Questions for this reading</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                locked ? "bg-danger-bg text-danger" : "bg-cream text-terracotta-dark ring-1 ring-brass/40"
              }`}
              aria-live="polite"
            >
              {counterLabel(reading.isFree, remaining, reading.questionsTotal)}
            </span>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-sand p-4" aria-live="polite">
            <div className="max-w-[88%] self-start rounded-2xl rounded-tl-sm border border-brass/40 bg-cream px-4 py-3 text-[0.95rem] text-ink">
              Namaste {firstName} 🙏 I&apos;ve studied your palm. Ask me anything about your love life, career, health
              or the year ahead, and I&apos;ll answer from your lines and mounts.
            </div>

            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-maroon px-4 py-2.5 text-[0.95rem] text-cream"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-[88%] self-start whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-brass/40 bg-cream px-4 py-3 text-[0.95rem] leading-relaxed text-ink"
                >
                  {m.content || (
                    <span className="flex gap-1 py-1" aria-label="Astrologer is typing">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brass [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brass [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brass" />
                    </span>
                  )}
                </div>
              ),
            )}

            {!hasAsked && !locked && (
              <div className="mt-1 flex flex-col items-start gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-umber">Try asking</p>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    disabled={streaming}
                    className="rounded-full border border-brass/50 bg-cream px-3.5 py-2 text-left text-sm font-semibold text-maroon hover:bg-blush"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-[#93000a]">
                {error}
              </p>
            )}

            {locked && !streaming && (
              <div className="mt-2 rounded-2xl bg-[#593b00] p-4 text-cream shadow-md">
                <p className="flex items-center gap-2 font-semibold">
                  <Lock className="h-4 w-4 text-[#f3be6a]" />
                  {reading.isFree ? "You've used your free question" : "You've used all questions for this reading"}
                </p>
                <p className="mt-1 text-sm text-cream/85">
                  Unlock a new reading with 10 questions for ₹99.
                </p>
                <button
                  onClick={() =>
                    openPayment({
                      reason: "Get a fresh reading plus 10 questions for the astrologer.",
                      onSuccess: () => router.push("/upload"),
                    })
                  }
                  className="btn-brass mt-3 w-full"
                >
                  Pay ₹99
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="border-t border-line bg-cream p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Your question
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={500}
                disabled={locked || streaming}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                placeholder={locked ? "No questions left" : "Ask about career, love, health…"}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl bg-blush-3 px-3.5 py-2.5 text-base text-ink outline-none placeholder:text-umber/70 focus:ring-2 focus:ring-maroon/25 disabled:cursor-not-allowed disabled:bg-[#eee6e2] disabled:text-umber/60"
              />
              <button
                type="submit"
                disabled={locked || streaming || input.trim().length < 2}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-maroon text-cream transition hover:bg-maroon-hover disabled:opacity-40"
                aria-label="Send question"
              >
                <SendHorizonal className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[0.7rem] text-umber">
              For entertainment only · not medical, legal or financial advice
            </p>
          </form>
        </div>
      )}
    </>
  );
}
