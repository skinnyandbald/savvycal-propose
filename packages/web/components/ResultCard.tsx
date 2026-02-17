"use client";

import { useState } from "react";

interface ResultCardProps {
  message: string;
  html: string;
}

function copyRichText(htmlContent: string, _plainText: string): boolean {
  // Create a temporary off-screen div with rendered HTML
  const div = document.createElement("div");
  div.innerHTML = htmlContent;
  div.style.position = "fixed";
  div.style.left = "-9999px";
  document.body.appendChild(div);

  const range = document.createRange();
  range.selectNodeContents(div);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    // execCommand not supported
  }

  selection?.removeAllRanges();
  document.body.removeChild(div);
  return ok;
}

function copyPlainText(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    // execCommand not supported
  }

  document.body.removeChild(textarea);
  return ok;
}

export function ResultCard({ message, html }: ResultCardProps) {
  const [copied, setCopied] = useState<"rich" | "plain" | false>(false);
  const [emailHint, setEmailHint] = useState(false);

  const flash = (type: "rich" | "plain") => {
    setCopied(type);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRich = async () => {
    // Try modern Clipboard API first (requires HTTPS or localhost)
    if (navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([message], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
        flash("rich");
        return;
      } catch {
        // Fall through to selection-based approach
      }
    }

    // Selection-based copy preserves rich text (links) on iOS
    if (copyRichText(html, message)) {
      flash("rich");
    }
  };

  const handleCopyPlain = async () => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(message);
        flash("plain");
        return;
      } catch {
        // Fall through
      }
    }

    if (copyPlainText(message)) {
      flash("plain");
    }
  };

  const handleEmail = async () => {
    // Copy rich text (with clickable links) to clipboard first,
    // then open a blank email compose for the user to paste into.
    // mailto: only supports plain text, so this two-step approach
    // is the only way to get HTML links into an email from the web.
    if (navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([message], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } catch {
        copyRichText(html, message);
      }
    } else {
      copyRichText(html, message);
    }

    setEmailHint(true);
    setTimeout(() => setEmailHint(false), 4000);

    const subject = encodeURIComponent("Meeting times");
    window.location.href = `mailto:?subject=${subject}`;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <pre className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {message}
      </pre>

      {emailHint && (
        <p className="mb-3 rounded-lg bg-blue-900/40 px-3 py-2 text-sm text-blue-300">
          Rich text copied — paste into the email body for clickable links
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopyRich}
          className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 active:bg-zinc-100"
        >
          {copied === "rich" ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={handleCopyPlain}
          className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 active:bg-zinc-700"
        >
          {copied === "plain" ? "Copied!" : "Plain text"}
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 active:bg-zinc-700"
        >
          Email
        </button>
      </div>
    </div>
  );
}
