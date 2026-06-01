import { describe, expect, test } from "vitest";

import { PolicyEngine } from "@/lib/agent/runtime-v4/policy/policy-engine";
import type { PolicySubject } from "@/lib/agent/runtime-v4/policy/policy-types";
import type { ToolExecutionContext } from "@/lib/agent/runtime-v4/tools/types";

const context: ToolExecutionContext = {
  userId: "user-1",
  projectId: "project-1",
  source: "test",
};

function subject(overrides: Partial<PolicySubject> = {}): PolicySubject {
  return {
    name: "test_tool",
    riskLevel: "low",
    sideEffect: "workspace",
    approvalPolicy: "never",
    availability: "available",
    ...overrides,
  };
}

describe("runtime-v4 policy engine", () => {
  test("allows workspace writes for the project owner", async () => {
    const policy = new PolicyEngine({
      getProjectOwnerId: async () => "user-1",
    });

    await expect(policy.check({ subject: subject(), context })).resolves.toEqual({
      status: "allowed",
    });
  });

  test("blocks workspace writes for a non-owner", async () => {
    const policy = new PolicyEngine({
      getProjectOwnerId: async () => "someone-else",
    });

    await expect(policy.check({ subject: subject(), context })).resolves.toMatchObject({
      status: "blocked",
      recoverable: false,
      reason: expect.stringMatching(/own this project/i),
    });
  });

  test("requires approval for external writes", async () => {
    const policy = new PolicyEngine();

    await expect(policy.check({
      subject: subject({ sideEffect: "external_write", riskLevel: "medium" }),
      context,
    })).resolves.toMatchObject({
      status: "requires_approval",
      approvalType: "external_write",
    });
  });

  test("requires approval for publish actions", async () => {
    const policy = new PolicyEngine();

    await expect(policy.check({
      subject: subject({ sideEffect: "publish", riskLevel: "high" }),
      context,
    })).resolves.toMatchObject({
      status: "requires_approval",
      approvalType: "publish",
    });
  });

  test("blocks destructive actions", async () => {
    const policy = new PolicyEngine();

    await expect(policy.check({
      subject: subject({ sideEffect: "destructive", riskLevel: "high" }),
      context,
    })).resolves.toMatchObject({
      status: "blocked",
      recoverable: false,
      reason: expect.stringMatching(/destructive/i),
    });
  });
});
