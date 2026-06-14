import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";

export function ApiTokenDisplay({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-accent-teal/40 bg-elevated px-3 py-2">
        <code className="flex-1 overflow-x-auto font-mono text-xs text-accent-teal">{token}</code>
        <button
          onClick={copy}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground transition"
          title="Copy token"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-accent-teal" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-accent-amber/30 bg-accent-amber/5 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
        <p className="text-xs text-accent-amber">This token grants access to your NEXUS account. Do not share it.</p>
      </div>
    </div>
  );
}
