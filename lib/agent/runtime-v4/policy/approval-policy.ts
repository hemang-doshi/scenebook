import type { ToolAvailability, ToolSideEffect } from "@/lib/agent/runtime-v4/tools/types";
import type { PolicyApprovalType, PolicySubject } from "@/lib/agent/runtime-v4/policy/policy-types";

export function isToolAvailable(availability: ToolAvailability) {
  return availability === "available";
}

export function subjectLabel(subject: Pick<PolicySubject, "name" | "displayName">) {
  return subject.displayName ?? subject.name;
}

export function availabilityReason(subject: PolicySubject) {
  return `${subjectLabel(subject)} is ${subject.availability}.`;
}

export function isWorkspaceSideEffect(sideEffect: ToolSideEffect) {
  return sideEffect === "workspace" ||
    sideEffect === "db_write" ||
    sideEffect === "asset_generation";
}

export function isDestructiveSideEffect(sideEffect: ToolSideEffect) {
  return sideEffect === "destructive" || sideEffect === "delete";
}

export function isExternalReadSideEffect(sideEffect: ToolSideEffect) {
  return sideEffect === "external_read";
}

export function approvalTypeForSubject(subject: PolicySubject): PolicyApprovalType | null {
  if (subject.sideEffect === "external_write" || subject.sideEffect === "editor_write") {
    return "external_write";
  }

  if (subject.sideEffect === "publish") {
    return "publish";
  }

  if (subject.approvalPolicy === "always") {
    return "policy";
  }

  if (subject.approvalPolicy === "on_risk" && subject.riskLevel === "high") {
    return "risk";
  }

  return null;
}

export function approvalReasonForSubject(
  subject: PolicySubject,
  approvalType: PolicyApprovalType,
) {
  const label = subjectLabel(subject);

  switch (approvalType) {
    case "external_write":
      return `${label} writes outside the SceneBook workspace and requires approval.`;
    case "publish":
      return `${label} publishes externally and requires approval.`;
    case "risk":
      return `${label} is high risk and requires approval.`;
    case "policy":
      return `${label} is configured to require approval.`;
  }
}
