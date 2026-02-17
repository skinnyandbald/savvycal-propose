"use client";

import { useState } from "react";

interface ResultCardProps {
  message: string;
}

export function ResultCard({ message }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Copy as both plain text and HTML (for rich links)
      const htmlMessage = message.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1">$1</a>',
      );

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([message], { type: "text/plain" }),
          "text/html": new Blob([htmlMessage], { type: "text/html" }),
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to plain text
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ text: message });
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <pre className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {message}
      </pre>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 active:bg-zinc-100"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 active:bg-zinc-700"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
