"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, createWebSocket, Message, LoopDetails, VerifyAccessResponse, Channel } from "@/lib/api";

// Memoized message item to prevent re-renders of entire list
const MessageItem = memo(function MessageItem({ msg }: { msg: Message }) {
  return (
    <div className="flex gap-4 group animate-fade-in-up">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 relative border border-border">
        {msg.sender_avatar ? (
          <Image
            src={msg.sender_avatar}
            alt={msg.sender_username}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted">
            {msg.sender_username[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground">
            {msg.sender_username}
          </span>
          <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-foreground/90 leading-relaxed break-words">
          {msg.content}
        </div>
      </div>
    </div>
  );
});

// Channel item component
const ChannelItem = memo(function ChannelItem({
  channel,
  isActive,
  onSelect,
}: {
  channel: Channel;
  isActive: boolean;
  onSelect: (channel: Channel) => void;
}) {
  return (
    <button
      onClick={() => onSelect(channel)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group ${
        isActive
          ? "bg-accent/10 text-accent border border-accent/20"
          : "hover:bg-secondary text-muted hover:text-foreground"
      }`}
    >
      <span className="text-lg opacity-70">#</span>
      <span className="text-sm font-medium truncate">{channel.name}</span>
      {channel.is_default && (
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-secondary text-muted">
          default
        </span>
      )}
    </button>
  );
});

interface ChatWindowProps {
  loopDetails: LoopDetails;
  initialMessages?: Message[];
  channels?: Channel[];
  activeChannel?: Channel;
  onMembershipChanged?: () => void;
  onChannelChange?: (channel: Channel) => void;
}

export default function ChatWindow({ 
  loopDetails, 
  initialMessages, 
  channels = [],
  activeChannel,
  onMembershipChanged,
  onChannelChange 
}: ChatWindowProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  // OPTIMIZATION: Use initial messages if provided, skip separate fetch
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [loading, setLoading] = useState(!initialMessages && loopDetails.is_member);
  const [connected, setConnected] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifyAccessResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [showChannelPanel, setShowChannelPanel] = useState(true);
  const [currentChannel, setCurrentChannel] = useState<Channel | undefined>(activeChannel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Update current channel when activeChannel prop changes
  useEffect(() => {
    if (activeChannel) {
      setCurrentChannel(activeChannel);
    }
  }, [activeChannel]);

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
        if (currentChannel) {
          const data = await api.getChannelMessages(currentChannel.id);
          setMessages(data.messages || []);
        } else {
          const data = await api.getMessages(loopDetails.name);
          setMessages(data.messages || []);
        }
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
  }, [loopDetails.name, loopDetails.is_member, initialMessages, currentChannel]);

  // Connect WebSocket with channel support
  useEffect(() => {
    if (!loopDetails.is_member) return;

    const ws = createWebSocket(loopDetails.id, currentChannel?.id);
    if (!ws) return;

    ws.onopen = () => {
      console.log("[WS] Connected to loop:", loopDetails.name, "channel:", currentChannel?.name);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.payload) {
          // Only add message if it's for the current channel
          if (!data.channel_id || data.channel_id === currentChannel?.id) {
            setMessages((prev) => [...prev, data.payload]);
          }
        } else if (data.type === "channel_switched") {
          console.log("[WS] Switched to channel:", data.channel_id);
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
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [loopDetails.id, loopDetails.name, loopDetails.is_member, currentChannel?.id, currentChannel?.name]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleChannelSelect = useCallback(async (channel: Channel) => {
    if (channel.id === currentChannel?.id) return;
    
    setLoading(true);
    setCurrentChannel(channel);
    
    // Switch channel via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "switch_channel",
        channel_id: channel.id,
      }));
    }

    // Fetch messages for new channel
    try {
      const data = await api.getChannelMessages(channel.id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch channel messages:", err);
    } finally {
      setLoading(false);
    }

    // Notify parent
    onChannelChange?.(channel);
  }, [currentChannel?.id, onChannelChange]);

  const handleSend = useCallback(() => {
    const content = message.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send via WebSocket - instant! No HTTP overhead
    wsRef.current.send(JSON.stringify({
      type: "message",
      content: content,
      channel_id: currentChannel?.id,
    }));

    // Clear input immediately (message will appear via WS broadcast)
    setMessage("");
  }, [message, currentChannel?.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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
      <div className="flex flex-col h-full bg-secondary/20 items-center justify-center">
        <div className="text-center p-8 max-w-md glass rounded-3xl">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-4xl mb-6 mx-auto">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-3">Access Required</h2>
          <p className="text-muted mb-6">
            You need to meet the contribution requirements to join this loop.
          </p>

          {!verification ? (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-6 py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-colors disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Check Eligibility"}
            </button>
          ) : verification.is_member ? (
            // User is already a member - trigger parent refresh to show chat
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-emerald-500/10 text-emerald-500">
                ✓ Already a Member
              </div>
              <button
                onClick={() => onMembershipChanged?.()}
                className="w-full py-3 rounded-xl bg-accent text-white hover:bg-accent-hover font-medium transition-colors"
              >
                Open Chat
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${verification.can_join
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
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
                      className={`p-3 rounded-lg border ${result.passed
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-card border-border"
                        }`}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {result.passed ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-muted">○</span>
                        )}
                        <span className="text-foreground">{result.message}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${result.passed ? "bg-emerald-500" : "bg-accent"
                              }`}
                            style={{
                              width: `${Math.min(
                                (result.actual / result.required) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted">
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
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Loop"}
                </button>
              ) : (
                <p className="text-sm text-muted">
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
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Channels Sidebar */}
      {channels.length > 0 && showChannelPanel && (
        <div className="w-52 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Channels</span>
            <button 
              onClick={() => setShowChannelPanel(false)}
              className="p-1 hover:bg-secondary rounded transition-colors"
            >
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={currentChannel?.id === channel.id}
                onSelect={handleChannelSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          {channels.length > 0 && !showChannelPanel && (
            <button 
              onClick={() => setShowChannelPanel(true)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Show channels"
            >
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
            {currentChannel ? "#" : "💬"}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {currentChannel ? `#${currentChannel.name}` : loopDetails.name}
            </h2>
            <p className="text-sm text-muted">
              {currentChannel?.description || `${loopDetails.members.length} member${loopDetails.members.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors ${connected
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-secondary text-muted"
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-muted"
                  }`}
              />
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Messages - this is the only scrollable area */}
        <div className="relative z-0 flex-1 min-h-0 overflow-y-auto p-6 scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl mb-4">
                {currentChannel ? "#" : "💬"}
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">
                Welcome to {currentChannel ? `#${currentChannel.name}` : loopDetails.name}
              </h3>
              <p className="text-muted max-w-md">
                {currentChannel?.description || "This is the beginning of your conversation. Start chatting with other verified contributors!"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - fixed at bottom */}
        <div className="relative z-10 flex-shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur-md">
          <div className="flex items-end gap-3 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={connected ? `Message ${currentChannel ? `#${currentChannel.name}` : loopDetails.name}` : "Connecting..."}
                rows={1}
                disabled={!connected}
                className="w-full px-4 py-3 bg-secondary/50 border border-transparent focus:border-accent focus:bg-background rounded-2xl text-foreground placeholder-muted focus:outline-none transition-all resize-none disabled:opacity-50 shadow-sm"
                style={{ minHeight: "52px", maxHeight: "150px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim() || !connected}
              className="p-3.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
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
          <p className="text-xs text-muted mt-2 text-center opacity-60">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
