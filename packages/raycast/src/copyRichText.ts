import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Raycast 2's Clipboard.copy({ html }) silently drops the HTML flavor,
// so write both flavors to the macOS pasteboard directly via JXA.
// Content is passed as argv to avoid any script quoting issues.
const JXA_SCRIPT = `
ObjC.import("AppKit");
function run(argv) {
  const pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  if (
    !pb.setStringForType($(argv[0]), $("public.html")) ||
    !pb.setStringForType($(argv[1]), $("public.utf8-plain-text"))
  ) {
    throw new Error("pasteboard write failed");
  }
}
`;

/**
 * Copy HTML with a plain-text fallback, using the provided fallback
 * if the native pasteboard write fails.
 */
export async function copyRichText(
  html: string,
  text: string,
  fallback: (content: { html: string; text: string }) => Promise<void>,
): Promise<void> {
  try {
    await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", JXA_SCRIPT, html, text],
      { timeout: 3000 },
    );
  } catch (error) {
    console.error("Native rich-text copy failed, falling back:", error);
    await fallback({ html, text });
  }
}
