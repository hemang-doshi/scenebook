import { describe, expect, test } from "vitest";

import { PolicyEngine } from "@/lib/agent/runtime-v4/policy/policy-engine";
import type { PolicySubject } from "@/lib/agent/runtime-v4/policy/policy-types";
import type { ToolExecutionContext } from "@/lib/agent/runtime-v4/tools/types";

const subject: PolicySubject = {
  name: "workspace_write",
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
};

describe("runtime-v4 policy account context", () => {
  test("runtime-v4 policy can receive account permission context", async () => {
    const context: ToolExecutionContext = {
      userId: "user-1",
      projectId: "project-1",
      source: "test",
      permissions: {
        canReadProject: true,
        canWriteProject: true,
        canApplyPatch: true,
        canManageIntegrations: true,
      },
    };
    const policy = new PolicyEngine({
      getProjectOwnerId: async () => "user-1",
    });

    await expect(policy.check({ subject, context })).resolves.toEqual({ status: "allowed" });
  });

  test("runtime-v4 policy blocks workspace writes when account context is read-only", async () => {
    const context: ToolExecutionContext = {
      userId: "user-1",
      projectId: "project-1",
      source: "test",
      permissions: {
        canReadProject: true,
        canWriteProject: false,
        canApplyPatch: false,
        canManageIntegrations: false,
      },
    };
    const policy = new PolicyEngine({
      getProjectOwnerId: async () => "user-1",
    });

    await expect(policy.check({ subject, context })).resolves.toMatchObject({
      status: "blocked",
      reason: expect.stringMatching(/permission/i),
    });
  });
});
