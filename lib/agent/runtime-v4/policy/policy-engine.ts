import { getProjectWorkspace } from "@/lib/data/repository";
import {
  approvalReasonForSubject,
  approvalTypeForSubject,
  availabilityReason,
  isDestructiveSideEffect,
  isExternalReadSideEffect,
  isToolAvailable,
  isWorkspaceSideEffect,
  subjectLabel,
} from "@/lib/agent/runtime-v4/policy/approval-policy";
import type {
  PolicyCheckInput,
  PolicyDecision,
  PolicyEngineOptions,
  ProjectOwnerResolver,
} from "@/lib/agent/runtime-v4/policy/policy-types";

const defaultProjectOwnerResolver: ProjectOwnerResolver = async (projectId) => {
  const workspace = await getProjectWorkspace(projectId);
  return workspace?.ownerId ?? null;
};

export class PolicyEngine {
  private readonly getProjectOwnerId: ProjectOwnerResolver;

  constructor(options: PolicyEngineOptions = {}) {
    this.getProjectOwnerId = options.getProjectOwnerId ?? defaultProjectOwnerResolver;
  }

  async check(input: PolicyCheckInput): Promise<PolicyDecision> {
    const { subject, context } = input;

    if (!isToolAvailable(subject.availability)) {
      return {
        status: "blocked",
        recoverable: false,
        reason: availabilityReason(subject),
      };
    }

    if (isDestructiveSideEffect(subject.sideEffect)) {
      return {
        status: "blocked",
        recoverable: false,
        reason: `${subjectLabel(subject)} is destructive and is blocked by policy.`,
      };
    }

    if (isExternalReadSideEffect(subject.sideEffect)) {
      return {
        status: "blocked",
        recoverable: false,
        reason: `${subjectLabel(subject)} reads from an external system and is blocked by policy.`,
      };
    }

    if (isWorkspaceSideEffect(subject.sideEffect)) {
      if (context.permissions && !context.permissions.canWriteProject) {
        return {
          status: "blocked",
          recoverable: false,
          reason: "Your account does not have permission to change this project.",
        };
      }

      const ownerId = await this.getProjectOwnerId(context.projectId, context);

      if (!ownerId || ownerId !== context.userId) {
        return {
          status: "blocked",
          recoverable: false,
          reason: "You do not own this project, so workspace changes are blocked.",
        };
      }
    }

    const approvalType = approvalTypeForSubject(subject);
    if (approvalType) {
      return {
        status: "requires_approval",
        approvalType,
        recoverable: true,
        reason: approvalReasonForSubject(subject, approvalType),
      };
    }

    return { status: "allowed" };
  }
}
