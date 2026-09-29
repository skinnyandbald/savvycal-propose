import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Raycast 2's Clipboard.copy({ html }) silently drops the HTML flavor,
// so write both flavors to the macOS pasteboard directly via JXA.
// Content is sent as JSON over stdin (not argv) so there is no script
// quoting and no ARG_MAX limit on large proposals.
const JXA_SCRIPT = `
ObjC.import("AppKit");
function run() {
  const data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  const input = JSON.parse(
    $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js,
  );
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  if (
    !pb.setStringForType($(input.html), $("public.html")) ||
    !pb.setStringForType($(input.text), $("public.utf8-plain-text"))
  ) {
    throw new Error("pasteboard write failed");
  }
}
`;

/**
 * Copy HTML with a plain-text fallback, using the provided fallback
 * if the native pasteboard write fails.
 *
 * Resolves to true if the native rich-text write succeeded, or false if
 * the fallback was used (which may lose the HTML flavor).
 */
export async function copyRichText(
  html: string,
  text: string,
  fallback: (content: { html: string; text: string }) => Promise<void>,
): Promise<boolean> {
  try {
    const pending = execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", JXA_SCRIPT],
      { timeout: 3000 },
    );
    // If osascript dies before draining stdin (timeout, early exit), the
    // write emits EPIPE; the real failure surfaces via the rejection below.
    pending.child.stdin?.on("error", () => {});
    pending.child.stdin?.end(JSON.stringify({ html, text }));
    await pending;
    return true;
  } catch (error) {
    console.error("Native rich-text copy failed, falling back:", error);
    await fallback({ html, text });
    return false;
  }
}
