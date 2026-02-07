"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  Message,
  Channel,
  createWebSocket,
  VerifyAccessResponse,
} from "@/lib/api";
import GitHubPanel from "./GitHubPanel";
import { renderMarkdown } from "@/lib/markdown";

// ============================================================================
// TYPES
// ============================================================================

interface LoopDetails {
  id: string;
  name: string;
  owner_id?: string;
  created_at: string;
  is_member?: boolean;
  members?: Array<{
    id: string;
    username: string;
    avatar_url: string;
    display_name: string;
    role: string;
  }>;
}

interface ChatWindowProps {
  loopDetails: LoopDetails;
  initialMessages?: Message[];
  channels?: Channel[];
  activeChannel?: Channel;
  onMembershipChanged?: () => void;
  onChannelChange?: (channel: Channel) => void;
  currentUserId?: string;
}

// ============================================================================
// MESSAGE CACHE: Per-channel message storage
// ============================================================================
const messageCache = new Map<string, Message[]>();

function getCachedMessages(channelId: string): Message[] {
  return messageCache.get(channelId) || [];
}

function setCachedMessages(channelId: string, messages: Message[]): void {
  messageCache.set(channelId, messages);
}

function updateCachedMessage(channelId: string, updater: (msgs: Message[]) => Message[]): void {
  const current = messageCache.get(channelId) || [];
  messageCache.set(channelId, updater(current));
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Individual message component - memoized to prevent re-renders
const MessageItem = memo(function MessageItem({
  msg,
  currentUserId,
  isOwner,
  onReply,
  onDelete,
}: {
  msg: Message;
  currentUserId?: string;
  isOwner: boolean;
  onReply: (msg: Message) => void;
  onDelete: (msg: Message) => void;
}) {
  const isOwnMessage = msg.sender_id === currentUserId;
  const canDelete = isOwnMessage || isOwner;
  const isDeleted = msg.content === "[Message deleted]";
  const replyCount = msg.reply_count ?? 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3 hover:bg-neutral-100/50 p-2 -mx-2 rounded-lg transition-colors"
    >
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-neutral-200 ring-2 ring-neutral-100">
        {msg.sender_avatar ? (
          <Image
            src={msg.sender_avatar}
            alt={msg.sender_username}
            width={36}
            height={36}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
            {msg.sender_username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-neutral-900">
            {msg.sender_username || "Unknown"}
          </span>
          <span className="text-xs text-neutral-400">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className={`text-sm mt-0.5 break-all ${isDeleted ? "text-neutral-400 italic" : "text-neutral-700"}`}>
          {isDeleted ? msg.content : renderMarkdown(msg.content)}
        </p>
        
        {/* Reply count & action buttons */}
        <div className="flex items-center gap-3 mt-1">
          {replyCount > 0 && (
            <button
              onClick={() => onReply(msg)}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
          
          {/* Action buttons - show on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
            {!isDeleted && (
              <button
                onClick={() => onReply(msg)}
                className="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Reply
              </button>
            )}
            {canDelete && !isDeleted && (
              <button
                onClick={() => onDelete(msg)}
                className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Thread reply component
const ThreadReplyItem = memo(function ThreadReplyItem({
  msg,
  currentUserId,
  isOwner,
  onDelete,
}: {
  msg: Message;
  currentUserId?: string;
  isOwner: boolean;
  onDelete: (msg: Message) => void;
}) {
  const isOwnMessage = msg.sender_id === currentUserId;
  const canDelete = isOwnMessage || isOwner;
  const isDeleted = msg.content === "[Message deleted]";

  return (
    <div className="group flex gap-2 hover:bg-neutral-100/50 p-2 -mx-2 rounded-lg transition-colors">
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-neutral-200 ring-1 ring-neutral-100">
        {msg.sender_avatar ? (
          <Image
            src={msg.sender_avatar}
            alt={msg.sender_username}
            width={28}
            height={28}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
            {msg.sender_username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs text-neutral-900">
            {msg.sender_username || "Unknown"}
          </span>
          <span className="text-xs text-neutral-400">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {canDelete && !isDeleted && (
            <button
              onClick={() => onDelete(msg)}
              className="opacity-0 group-hover:opacity-100 ml-auto text-xs text-red-400 hover:text-red-500"
            >
              Delete
            </button>
          )}
        </div>
        <p className={`text-sm mt-0.5 break-all ${isDeleted ? "text-neutral-400 italic" : "text-neutral-700"}`}>
          {isDeleted ? msg.content : renderMarkdown(msg.content)}
        </p>
      </div>
    </div>
  );
});

// Channel item component
const ChannelItem = memo(function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
        isActive
          ? "bg-neutral-900 text-white"
          : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
      }`}
    >
      <span className={isActive ? "text-neutral-400" : "text-neutral-400"}>#</span>
      <span className="truncate font-medium">{channel.name}</span>
    </motion.button>
  );
});

// Thread panel component
function ThreadPanel({
  parentMessage,
  replies,
  loading,
  currentUserId,
  isOwner,
  onClose,
  onSendReply,
  onDeleteReply,
}: {
  parentMessage: Message;
  replies: Message[];
  loading: boolean;
  currentUserId?: string;
  isOwner: boolean;
  onClose: () => void;
  onSendReply: (content: string) => void;
  onDeleteReply: (msg: Message) => void;
}) {
  const [replyInput, setReplyInput] = useState("");
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSend = () => {
    const content = replyInput.trim();
    if (!content) return;
    onSendReply(content);
    setReplyInput("");
  };

  return (
    <motion.div 
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 border-l border-neutral-200 bg-white flex flex-col h-full"
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
        <h3 className="font-semibold text-sm text-neutral-900">Thread</h3>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500 hover:text-neutral-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      </div>

      {/* Parent message */}
      <div className="shrink-0 px-4 py-3 border-b border-neutral-200 bg-neutral-50/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200">
            {parentMessage.sender_avatar ? (
              <Image
                src={parentMessage.sender_avatar}
                alt={parentMessage.sender_username}
                width={24}
                height={24}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                {parentMessage.sender_username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-medium text-sm text-neutral-900">{parentMessage.sender_username}</span>
        </div>
        <p className="text-sm text-neutral-700">{renderMarkdown(parentMessage.content)}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 py-4">No replies yet</p>
        ) : (
          replies.map((reply) => (
            <ThreadReplyItem
              key={reply.id}
              msg={reply}
              currentUserId={currentUserId}
              isOwner={isOwner}
              onDelete={onDeleteReply}
            />
          ))
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Reply input */}
      <div className="shrink-0 p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Reply in thread..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-white border border-neutral-200 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
          />
          <motion.button
            onClick={handleSend}
            disabled={!replyInput.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Delete confirmation modal
function DeleteModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-neutral-200 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
      >
        <h3 className="text-lg font-semibold mb-2 text-neutral-900">Delete Message</h3>
        <p className="text-neutral-500 text-sm mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg hover:bg-neutral-100 transition-colors text-neutral-700"
          >
            Cancel
          </button>
          <motion.button
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
          >
            Delete
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Create channel modal
function CreateChannelModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (channel: Channel) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!channelName) {
      setError("Channel name is required");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const channel = await api.createChannel({ project_id: projectId, name: channelName });
      onCreated(channel);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-neutral-200 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
      >
        <h3 className="text-lg font-semibold mb-4 text-neutral-900">Create Channel</h3>
        <div className="mb-4">
          <label className="block text-sm text-neutral-500 mb-1">Channel Name</label>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">#</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="general"
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-neutral-100 transition-colors text-neutral-700"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 text-sm rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {creating ? "Creating..." : "Create"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Message skeleton for loading state
function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-2 animate-pulse">
      <div className="shrink-0 w-9 h-9 rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 bg-neutral-200 rounded" />
          <div className="h-3 w-12 bg-neutral-200 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatWindow({
  loopDetails,
  initialMessages = [],
  channels = [],
  activeChannel,
  onMembershipChanged,
  onChannelChange,
  currentUserId,
}: ChatWindowProps) {
  const router = useRouter();

  // Core state
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifyAccessResponse | null>(null);
  const [joining, setJoining] = useState(false);

  // Channel state
  const [currentChannel, setCurrentChannel] = useState<Channel | undefined>(activeChannel);
  const [channelList, setChannelList] = useState<Channel[]>(channels);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelPanel, setShowChannelPanel] = useState(true);

  // Message state - keyed by channel
  const [messages, setMessages] = useState<Message[]>(() => {
    // Initialize from cache or initial messages
    const channelId = activeChannel?.id || loopDetails.id;
    const cached = getCachedMessages(channelId);
    if (cached.length > 0) return cached;
    if (initialMessages.length > 0) {
      setCachedMessages(channelId, initialMessages);
      return initialMessages;
    }
    return [];
  });
  const [channelLoading, setChannelLoading] = useState(false);

  // Thread state
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // GitHub panel state
  const [showGitHub, setShowGitHub] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentChannelRef = useRef<Channel | undefined>(currentChannel);

  // Derived state
  const isOwner = currentUserId === loopDetails.owner_id;
  const channelId = currentChannel?.id || loopDetails.id;

  // Keep ref in sync
  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize on loop change - DON'T tear down WebSocket
  useEffect(() => {
    // Reset channel-related state
    setCurrentChannel(activeChannel);
    setChannelList(channels);
    setThreadParent(null);
    setThreadReplies([]);
    setVerification(null);

    // Initialize messages from cache or initial
    const cid = activeChannel?.id || loopDetails.id;
    const cached = getCachedMessages(cid);
    if (cached.length > 0) {
      setMessages(cached);
    } else if (initialMessages.length > 0) {
      setMessages(initialMessages);
      setCachedMessages(cid, initialMessages);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopDetails.id]);

  // Update channels when prop changes
  useEffect(() => {
    if (channels.length > 0) {
      setChannelList(channels);
    }
  }, [channels]);

  // Update active channel from prop
  useEffect(() => {
    if (activeChannel && activeChannel.id !== currentChannel?.id) {
      setCurrentChannel(activeChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id]);

  // WebSocket connection - stable, doesn't reconnect on channel change
  useEffect(() => {
    if (!loopDetails.is_member) return;

    // Connect to project, not specific channel
    const ws = createWebSocket(loopDetails.id, currentChannel?.id);
    if (!ws) return;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message" && data.payload) {
          const msg = data.payload;
          const msgChannelId = data.channel_id || msg.channel_id;

          // Handle thread reply
          if (msg.parent_id) {
            // Update thread replies if viewing this thread
            setThreadReplies((prev) => {
              const exists = prev.some(
                (m) => m.id === msg.id || (m.id.startsWith("temp-") && m.content === msg.content)
              );
              if (exists) {
                return prev.map((m) =>
                  m.id.startsWith("temp-") && m.content === msg.content ? msg : m
                );
              }
              return [...prev, msg];
            });

            // Update reply count on parent - only for others' messages
            if (msg.sender_id !== currentUserId) {
              const cid = msgChannelId || currentChannelRef.current?.id || loopDetails.id;
              updateCachedMessage(cid, (prev) =>
                prev.map((m) =>
                  m.id === msg.parent_id
                    ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                    : m
                )
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.parent_id
                    ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                    : m
                )
              );
            }
          } else {
            // Regular message - only add if for current channel
            const targetChannelId = currentChannelRef.current?.id || loopDetails.id;
            if (!msgChannelId || msgChannelId === targetChannelId) {
              setMessages((prev) => {
                const exists = prev.some(
                  (m) => m.id === msg.id || (m.id.startsWith("temp-") && m.content === msg.content)
                );
                if (exists) {
                  return prev.map((m) =>
                    m.id.startsWith("temp-") && m.content === msg.content ? msg : m
                  );
                }
                return [...prev, msg];
              });
              // Also update cache
              updateCachedMessage(targetChannelId, (prev) => {
                const exists = prev.some(
                  (m) => m.id === msg.id || (m.id.startsWith("temp-") && m.content === msg.content)
                );
                if (exists) {
                  return prev.map((m) =>
                    m.id.startsWith("temp-") && m.content === msg.content ? msg : m
                  );
                }
                return [...prev, msg];
              });
            }
          }
        } else if (data.type === "message_deleted" && data.message_id) {
          // Handle deletion - update both state and cache
          const updateDelete = (prev: Message[]) =>
            prev.map((m) =>
              m.id === data.message_id ? { ...m, content: "[Message deleted]" } : m
            );
          setMessages(updateDelete);
          setThreadReplies(updateDelete);
          // Update all channel caches
          messageCache.forEach((_, key) => {
            updateCachedMessage(key, updateDelete);
          });
        } else if (data.type === "channel_switched") {
          // Server confirmed channel switch
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      // Ignore - expected during React re-renders
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopDetails.id, loopDetails.is_member]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle channel selection - NO WebSocket reconnect
  const handleChannelSelect = useCallback(async (channel: Channel) => {
    if (channel.id === currentChannel?.id) return;

    // 1. Update current channel immediately
    setCurrentChannel(channel);
    currentChannelRef.current = channel;

    // 2. Check cache first - instant switch!
    const cached = getCachedMessages(channel.id);
    if (cached.length > 0) {
      setMessages(cached);
      setChannelLoading(false);
    } else {
      // IMPORTANT: Clear old messages immediately to prevent flash of wrong channel's messages
      setMessages([]);
      setChannelLoading(true);
    }

    // 3. Switch channel on server via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "switch_channel",
        channel_id: channel.id,
      }));
    }

    // 4. Fetch fresh messages (will update cache)
    try {
      const data = await api.getChannelMessages(channel.id);
      const newMessages = data.messages || [];
      setCachedMessages(channel.id, newMessages);
      // Only update if still on this channel
      if (currentChannelRef.current?.id === channel.id) {
        setMessages(newMessages);
      }
    } catch (err) {
      console.error("Failed to fetch channel messages:", err);
      // Keep cached data if available
      if (!cached.length) {
        setMessages([]);
      }
    } finally {
      setChannelLoading(false);
    }

    // Close thread panel
    setThreadParent(null);
    setThreadReplies([]);

    // Notify parent
    onChannelChange?.(channel);
  }, [currentChannel?.id, onChannelChange]);

  // Handle opening a thread
  const handleViewThread = useCallback(async (msg: Message) => {
    setThreadParent(msg);
    setThreadReplies([]);

    // Can't fetch for temp messages
    if (msg.id.startsWith("temp-")) return;

    setThreadLoading(true);
    try {
      const data = await api.getThreadReplies(msg.id);
      setThreadReplies(data.replies || []);
    } catch (err) {
      console.error("Failed to load thread:", err);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Handle sending thread reply
  const handleSendThreadReply = useCallback((content: string) => {
    if (!threadParent || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: "message",
      content,
      channel_id: currentChannel?.id,
      parent_id: threadParent.id,
    }));

    // Optimistic reply
    const optimisticReply: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: currentUserId || "",
      sender_username: "You",
      sender_avatar: "",
      created_at: new Date().toISOString(),
      parent_id: threadParent.id,
    };
    setThreadReplies((prev) => [...prev, optimisticReply]);

    // Optimistically update reply count
    setMessages((prev) =>
      prev.map((m) =>
        m.id === threadParent.id
          ? { ...m, reply_count: (m.reply_count || 0) + 1 }
          : m
      )
    );
    updateCachedMessage(channelId, (prev) =>
      prev.map((m) =>
        m.id === threadParent.id
          ? { ...m, reply_count: (m.reply_count || 0) + 1 }
          : m
      )
    );
  }, [threadParent, currentChannel?.id, currentUserId, channelId]);

  // Handle delete - show modal first
  const handleDeleteClick = useCallback((msg: Message) => {
    if (msg.id.startsWith("temp-")) return;
    setDeleteTarget(msg);
  }, []);

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const msgId = deleteTarget.id;
    setDeleteTarget(null);

    // Optimistic delete - update UI immediately
    const updateDelete = (prev: Message[]) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: "[Message deleted]" } : m));

    setMessages(updateDelete);
    setThreadReplies(updateDelete);
    updateCachedMessage(channelId, updateDelete);

    // Actually delete
    try {
      await api.deleteMessage(msgId);
    } catch (err) {
      console.error("Failed to delete:", err);
      // Revert would be complex - server broadcast will correct if needed
    }
  }, [deleteTarget, channelId]);

  // Handle channel creation
  const handleChannelCreated = useCallback((channel: Channel) => {
    setChannelList((prev) => [...prev, channel]);
  }, []);

  // Handle send message
  const handleSend = useCallback(() => {
    const content = message.trim();
    if (!content) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[Chat] WebSocket not ready");
      return;
    }

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: "message",
      content,
      channel_id: currentChannel?.id,
    }));

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: currentUserId || "",
      sender_username: "You",
      sender_avatar: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    updateCachedMessage(channelId, (prev) => [...prev, optimisticMsg]);

    setMessage("");
  }, [message, currentChannel?.id, currentUserId, channelId]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle sharing GitHub summary to chat
  const handleShareToChat = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: "message",
      content,
      channel_id: currentChannel?.id,
    }));

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: currentUserId || "",
      sender_username: "You",
      sender_avatar: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    updateCachedMessage(channelId, (prev) => [...prev, optimisticMsg]);
    setShowGitHub(false);
  }, [currentChannel?.id, currentUserId, channelId]);

  // Handle verify access
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

  // Handle join loop
  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.joinLoop(loopDetails.name);
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

  // Non-member view
  if (!loopDetails.is_member) {
    return (
      <div className="flex flex-col h-full bg-neutral-50 items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xl"
        >
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6 mx-auto">
            <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-neutral-900">Access Required</h2>
          <p className="text-neutral-500 mb-6">
            This loop requires verification of your GitHub contributions to join.
          </p>

          {!verification ? (
            <motion.button
              onClick={handleVerify}
              disabled={verifying}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-neutral-900 text-white font-medium transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Check Eligibility"}
            </motion.button>
          ) : verification.is_member ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Already a Member
                </div>
                <p className="text-sm text-neutral-600">You have access to this loop.</p>
              </div>
              <motion.button
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800"
              >
                Open Chat
              </motion.button>
            </div>
          ) : verification.can_join ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Eligible!
                </div>
                <p className="text-sm text-neutral-600">{verification.message}</p>
              </div>
              <motion.button
                onClick={handleJoin}
                disabled={joining}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join Loop"}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Not Eligible
                </div>
                <p className="text-sm text-neutral-600">{verification.message}</p>
              </div>

              {verification.results && verification.results.length > 0 && (
                <div className="text-left space-y-2">
                  {verification.results.map((result, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border ${
                        result.passed ? "bg-emerald-50 border-emerald-200" : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{result.passed ? "✅" : "❌"}</span>
                        <span className="text-sm text-neutral-700">{result.criteria}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {result.actual} / {result.required} required
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Member view - main chat
  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Channel creation modal */}
      <AnimatePresence>
        {showCreateChannel && (
          <CreateChannelModal
            projectId={loopDetails.id}
            onClose={() => setShowCreateChannel(false)}
            onCreated={handleChannelCreated}
          />
        )}
      </AnimatePresence>

      {/* Channels sidebar */}
      <AnimatePresence>
        {showChannelPanel && channelList.length > 0 && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 224, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 border-r border-neutral-200 bg-white flex flex-col h-full overflow-hidden"
          >
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-neutral-900">Channels</h3>
              {isOwner && (
                <motion.button
                  onClick={() => setShowCreateChannel(true)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-900"
                  title="Create channel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </motion.button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {channelList.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={currentChannel?.id === channel.id}
                  onClick={() => handleChannelSelect(channel)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {channelList.length > 0 && (
              <motion.button
                onClick={() => setShowChannelPanel(!showChannelPanel)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </motion.button>
            )}
            <div>
              <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
                {currentChannel ? (
                  <>
                    <span className="text-neutral-400">#</span>
                    {currentChannel.name}
                  </>
                ) : (
                  loopDetails.name
                )}
              </h2>
              <p className="text-xs text-neutral-500">{loopDetails.members?.length || 0} members</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => {
                setShowGitHub(!showGitHub);
                if (!showGitHub) setThreadParent(null);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded-lg transition-colors ${
                showGitHub
                  ? "bg-neutral-900 text-white"
                  : "hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900"
              }`}
              title="GitHub Issues & PRs"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
            </motion.button>
            <div className="flex items-center gap-2" title={connected ? "Connected" : "Reconnecting"}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {channelLoading && messages.length === 0 ? (
            // Show skeletons only if no cached messages
            <>
              <MessageSkeleton />
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          ) : messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-medium text-neutral-900 mb-1">
                {currentChannel ? `Welcome to #${currentChannel.name}` : "Start the conversation"}
              </h3>
              <p className="text-sm text-neutral-500">Be the first to send a message!</p>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onReply={handleViewThread}
                onDelete={handleDeleteClick}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentChannel ? `Message #${currentChannel.name}` : "Type a message..."}
                className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100 resize-none text-sm min-h-[48px] max-h-32"
                rows={1}
              />
            </div>
            <motion.button
              onClick={handleSend}
              disabled={!message.trim() || !connected}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="shrink-0 w-12 h-12 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Thread panel */}
      <AnimatePresence>
        {threadParent && !showGitHub && (
          <ThreadPanel
            parentMessage={threadParent}
            replies={threadReplies}
            loading={threadLoading}
            currentUserId={currentUserId}
            isOwner={isOwner}
            onClose={() => {
              setThreadParent(null);
              setThreadReplies([]);
            }}
            onSendReply={handleSendThreadReply}
            onDeleteReply={handleDeleteClick}
          />
        )}
      </AnimatePresence>

      {/* GitHub Context panel */}
      <AnimatePresence>
        {showGitHub && (
          <GitHubPanel
            loopName={loopDetails.name}
            onShareToChat={handleShareToChat}
            onClose={() => setShowGitHub(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
