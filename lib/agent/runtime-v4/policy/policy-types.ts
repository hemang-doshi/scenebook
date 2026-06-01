import type { JsonValue } from "@/lib/types";
import type {
  ToolApprovalPolicy,
  ToolAvailability,
  ToolExecutionContext,
  ToolRiskLevel,
  ToolSideEffect,
} from "@/lib/agent/runtime-v4/tools/types";

export type PolicySubject = {
  name: string;
  displayName?: string;
  riskLevel: ToolRiskLevel;
  sideEffect: ToolSideEffect;
  approvalPolicy: ToolApprovalPolicy;
  availability: ToolAvailability;
};

export type PolicyApprovalType =
  | "external_write"
  | "publish"
  | "policy"
  | "risk";

export type PolicyCheckInput = {
  subject: PolicySubject;
  context: ToolExecutionContext;
  input?: unknown;
};

export type PolicyAllowedResult = {
  status: "allowed";
};

export type PolicyRequiresApprovalResult = {
  status: "requires_approval";
  approvalType: PolicyApprovalType;
  reason: string;
  recoverable: true;
  preview?: Record<string, JsonValue>;
};

export type PolicyBlockedResult = {
  status: "blocked";
  reason: string;
  recoverable: boolean;
  preview?: Record<string, JsonValue>;
};

export type PolicyDecision =
  | PolicyAllowedResult
  | PolicyRequiresApprovalResult
  | PolicyBlockedResult;

export type ProjectOwnerResolver = (
  projectId: string,
  context: ToolExecutionContext,
) => string | null | undefined | Promise<string | null | undefined>;

export type PolicyEngineOptions = {
  getProjectOwnerId?: ProjectOwnerResolver;
};

export type PolicyEngineLike = {
  check(input: PolicyCheckInput): Promise<PolicyDecision | { status: string }> | PolicyDecision | { status: string };
};
