"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ToolCallCard } from "@/components/agent/tool-call-card";
import type { AgentUiToolCall } from "@/components/agent/agent-chat-island";

export function ApprovalCard({ toolCall }: { toolCall: AgentUiToolCall }) {
  const [decision, setDecision] = useState<"pending" | "approved" | "editing" | "rejected">(
    "pending",
  );

  return (
    <div className="grid gap-3">
      <ToolCallCard toolCall={{ ...toolCall, status: decision === "pending" ? toolCall.status : decision }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setDecision("approved")}>
          Approve
        </Button>
        <Button type="button" variant="ghost" onClick={() => setDecision("editing")}>
          Edit
        </Button>
        <Button type="button" variant="ghost" onClick={() => setDecision("rejected")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
