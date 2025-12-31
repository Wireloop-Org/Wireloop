"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, createWebSocket, Message, LoopDetails, VerifyAccessResponse } from "@/lib/api";

interface ChatWindowProps {
  loopDetails: LoopDetails;
  initialMessages?: Message[]; // OPTIMIZATION: Pass messages from parent to avoid extra fetch
  onMembershipChanged?: () => void;
}

export default function ChatWindow({ loopDetails, initialMessages, onMembershipChanged }: ChatWindowProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  // OPTIMIZATION: Use initial messages if provided, skip separate fetch
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [loading, setLoading] = useState(!initialMessages && loopDetails.is_member);
  const [connected, setConnected] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifyAccessResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // OPTIMIZATION: Only fetch messages if not provided initially
  useEffect(() => {
    // If we already have messages from parent, skip fetch
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const data = await api.getMessages(loopDetails.name);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    if (loopDetails.is_member && !initialMessages) {
      fetchMessages();
    } else {
      setLoading(false);
    }
  }, [loopDetails.name, loopDetails.is_member, initialMessages]);

  // Connect WebSocket
  useEffect(() => {
    if (!loopDetails.is_member) return;

    const ws = createWebSocket(loopDetails.id);
    if (!ws) return;

    ws.onopen = () => {
      console.log("[WS] Connected to loop:", loopDetails.name);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.payload) {
          setMessages((prev) => [...prev, data.payload]);
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      setConnected(false);
    };

    ws.onerror = () => {
      // WebSocket errors are expected during React re-renders in dev mode
      // The connection will be re-established automatically
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [loopDetails.id, loopDetails.name, loopDetails.is_member]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = () => {
    const content = message.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send via WebSocket - instant! No HTTP overhead
    wsRef.current.send(JSON.stringify({
      type: "message",
      content: content,
    }));

    // Clear input immediately (message will appear via WS broadcast)
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyAccess(loopDetails.name);
      setVerification(result);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.joinLoop(loopDetails.name);
      // Refresh the page to reload loop details with membership
      if (onMembershipChanged) {
        onMembershipChanged();
      } else {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setJoining(false);
    }
  };

  if (!loopDetails.is_member) {
    return (
      <div className="flex flex-col h-full bg-zinc-900/30 items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-4xl mb-6 mx-auto">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-3">Access Required</h2>
          <p className="text-zinc-400 mb-6">
            You need to meet the contribution requirements to join this loop.
          </p>

          {!verification ? (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Check Eligibility"}
            </button>
          ) : verification.is_member ? (
            // User is already a member - trigger parent refresh to show chat
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-emerald-500/10 text-emerald-400">
                ✓ Already a Member
              </div>
              <button
                onClick={() => onMembershipChanged?.()}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                Open Chat
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                  verification.can_join
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {verification.can_join ? "✓ Eligible" : "✗ Not Eligible"}
              </div>

              {/* Requirements */}
              {verification.results.length > 0 && (
                <div className="space-y-2 text-left">
                  {verification.results.map((result, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        result.passed
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-zinc-800/50 border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {result.passed ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-zinc-500">○</span>
                        )}
                        <span>{result.message}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              result.passed ? "bg-emerald-500" : "bg-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                (result.actual / result.required) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">
                          {result.actual}/{result.required}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              {verification.can_join ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Loop"}
                </button>
              ) : (
                <p className="text-sm text-zinc-500">
                  Keep contributing to this repository to unlock access!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-lg">
          💬
        </div>
        <div>
          <h2 className="font-semibold">{loopDetails.name}</h2>
          <p className="text-sm text-zinc-500">
            {loopDetails.members.length} member
            {loopDetails.members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              connected
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-zinc-500"
              }`}
            />
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages - this is the only scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl mb-4">
              💬
            </div>
            <h3 className="text-lg font-medium mb-2">
              Welcome to {loopDetails.name}
            </h3>
            <p className="text-zinc-500 max-w-md">
              This is the beginning of your loop. Start a conversation with
              other verified contributors!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 group">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 relative">
                  {msg.sender_avatar ? (
                    <Image
                      src={msg.sender_avatar}
                      alt={msg.sender_username}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">
                      {msg.sender_username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm text-zinc-200">
                      {msg.sender_username}
                    </span>
                    <span className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-0.5 break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-zinc-800">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? "Type a message..." : "Connecting..."}
              rows={1}
              disabled={!connected}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || !connected}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
