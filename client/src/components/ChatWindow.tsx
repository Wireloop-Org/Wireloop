"use client";

import { useState } from "react";
import { Project } from "@/lib/api";

interface ChatWindowProps {
  project: Project;
}

interface Message {
  id: string;
  content: string;
  sender: {
    username: string;
    avatar_url: string;
  };
  created_at: string;
}

export default function ChatWindow({ project }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: Implement WebSocket message sending
    console.log("Sending:", message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/30">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-lg">
          💬
        </div>
        <div>
          <h2 className="font-semibold">{project.Name}</h2>
          <p className="text-sm text-zinc-500">{project.FullName}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl mb-4">
              💬
            </div>
            <h3 className="text-lg font-medium mb-2">Welcome to {project.Name}</h3>
            <p className="text-zinc-500 max-w-md">
              This is the beginning of your loop. Start a conversation with other
              verified contributors!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {msg.sender.username}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
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
        <p className="text-xs text-zinc-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}


