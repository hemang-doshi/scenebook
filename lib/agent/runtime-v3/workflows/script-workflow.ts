import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { WorkflowHandlerInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";
import type { JsonValue, ScriptLab } from "@/lib/types";

function workflowPrompt(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null && "prompt" in input.workflowInput
    ? String((input.workflowInput as { prompt?: unknown }).prompt ?? "")
    : input.context.rawInput;
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function filled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function isVagueScriptPrompt(prompt: string, snapshot: ProjectSnapshot) {
  const normalized = prompt.trim().toLowerCase();
  if (normalized === "/script" || normalized === "write a script" || normalized === "make a script") {
    return true;
  }

  if (hasExistingScript(snapshot) && isRewriteRequest(prompt)) {
    return false;
  }

  const briefHasDirection = filled(snapshot.creativeBrief?.audience)
    && filled(snapshot.creativeBrief?.coreAngle)
    && filled(snapshot.creativeBrief?.tone);
  return wordCount(prompt) < 8 && !briefHasDirection;
}

function highLeverageQuestions(snapshot: ProjectSnapshot) {
  const questions: string[] = [];
  if (!filled(snapshot.creativeBrief?.audience)) questions.push("Who is this for?");
  if (!filled(snapshot.creativeBrief?.coreAngle)) questions.push("What is the core angle or promise?");
  if (!filled(snapshot.creativeBrief?.tone)) questions.push("What tone should it have?");
  return questions.slice(0, 3);
}

function hasExistingScript(snapshot: ProjectSnapshot) {
  return filled(snapshot.scriptLab.script);
}

function isCritiqueOnlyRequest(prompt: string) {
  return /\b(critique|review|be harsh|is this script good)\b/i.test(prompt)
    && !isRewriteRequest(prompt)
    && !wantsSave(prompt);
}

function isRewriteRequest(prompt: string) {
  return /\b(rewrite|punchier|stronger|improve|tighten|sharpen)\b/i.test(prompt);
}

function explicitlyAvoidsSave(prompt: string) {
  return /\b(don't save|do not save|without saving|not save|draft only)\b/i.test(prompt);
}

function wantsSave(prompt: string) {
  return !explicitlyAvoidsSave(prompt)
    && /\b(save|current version|make it current|as the current version)\b/i.test(prompt);
}

function shouldSaveScript(input: {
  prompt: string;
  snapshot: ProjectSnapshot;
  mode: "new" | "rewrite";
}) {
  if (explicitlyAvoidsSave(input.prompt)) return false;
  if (wantsSave(input.prompt)) return true;
  return input.mode === "new" && !hasExistingScript(input.snapshot);
}

function stringOutput(observation: ToolObservation, key: string) {
  const value = observation.output?.[key];
  return typeof value === "string" ? value : "";
}

function scriptPatch(observation: ToolObservation) {
  return {
    hook: stringOutput(observation, "hook"),
    outline: stringOutput(observation, "outline"),
    script: stringOutput(observation, "script"),
    caption: stringOutput(observation, "caption"),
    cta: stringOutput(observation, "cta"),
    onScreenText: stringOutput(observation, "onScreenText"),
  };
}

function hasUsablePatch(patch: Record<string, string>) {
  return filled(patch.hook) && filled(patch.script);
}

function mergeScriptLab(scriptLab: ScriptLab, patch: Record<string, string>) {
  return {
    ...scriptLab,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value.trim().length > 0)),
  } as unknown as Record<string, JsonValue>;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function runTool(input: WorkflowHandlerInput, toolName: string, rawInput: unknown) {
  return executeRuntimeV3Tool({
    toolName,
    rawInput,
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });
}

async function finishSavedScript(input: WorkflowHandlerInput, params: {
  observations: ToolObservation[];
  patch: Record<string, string>;
  prompt: string;
  critique?: string;
  mode: "new" | "rewrite";
}) {
  const scriptLab = mergeScriptLab(input.snapshot.scriptLab, params.patch);
  const title = params.patch.hook || `${input.snapshot.project.title} script`;
  const version = await runTool(input, "create_script_version", {
    title,
    scriptLab,
    active: true,
    metadata: {
      workflow: "script_workflow",
      mode: params.mode,
    },
  });
  params.observations.push(version);

  const artifact = await runTool(input, "create_project_artifact", {
    artifactType: "script_package",
    title,
    payload: {
      kind: "script_package",
      ...params.patch,
      critique: params.critique ?? null,
    },
    metadata: {
      workflow: "script_workflow",
      mode: params.mode,
    },
  });
  params.observations.push(artifact);

  if (input.snapshot.activeGoal) {
    const goal = await runTool(input, "update_active_goal", {
      title: input.snapshot.activeGoal.title,
      stage: "asset_planning",
      completedSteps: unique([...input.snapshot.activeGoal.completedSteps, "script"]),
      nextActions: ["Plan supporting assets", "Prepare shoot pack"],
      blockers: input.snapshot.activeGoal.blockers,
    });
    params.observations.push(goal);
  }

  return {
    observations: params.observations,
    finalResponse: "Script package generated, critiqued, saved, versioned, and verified. The tool cards show the exact workspace changes.",
  };
}

export async function runScriptWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const prompt = workflowPrompt(input);

  if (isVagueScriptPrompt(prompt, input.snapshot)) {
    return {
      waitingForUser: true,
      observations: [],
      finalResponse: `I need a little more context before writing the script: ${highLeverageQuestions(input.snapshot).join(" ")}`,
    };
  }

  if (isCritiqueOnlyRequest(prompt)) {
    if (!hasExistingScript(input.snapshot)) {
      return {
        waitingForUser: true,
        observations: [],
        finalResponse: "I do not see a script in Script Lab yet. Paste the script or ask me to draft one first.",
      };
    }

    const critique = await runTool(input, "critique_script", {
      script: input.snapshot.scriptLab.script,
      request: prompt,
    });
    return {
      observations: [critique],
      finalResponse: critique.status === "completed"
        ? `${stringOutput(critique, "critique")}\n\nNext action: tell me whether to rewrite it or save a specific change.`
        : `I could not critique the script: ${critique.message}`,
    };
  }

  const mode = isRewriteRequest(prompt) && hasExistingScript(input.snapshot) ? "rewrite" : "new";
  const observations: ToolObservation[] = [];
  let critiqueText = "";

  if (mode === "rewrite") {
    const critique = await runTool(input, "critique_script", {
      script: input.snapshot.scriptLab.script,
      request: prompt,
    });
    observations.push(critique);
    critiqueText = stringOutput(critique, "critique");
    if (critique.status !== "completed") {
      return {
        observations,
        finalResponse: `I could not critique the current script before rewriting: ${critique.message}`,
      };
    }
  }

  const generated = await runTool(input, "generate_script_package", {
    prompt,
    mode,
    currentScript: mode === "rewrite" ? input.snapshot.scriptLab.script : undefined,
    creativeBrief: input.snapshot.creativeBrief ?? undefined,
  });
  observations.push(generated);

  if (generated.status !== "completed") {
    return {
      observations,
      finalResponse: `I could not generate the script package: ${generated.message}`,
    };
  }

  const patch = scriptPatch(generated);
  if (!hasUsablePatch(patch)) {
    return {
      observations,
      finalResponse: "The generated script package was incomplete, so I did not save it.",
    };
  }

  if (mode === "new") {
    const critique = await runTool(input, "critique_script", {
      script: patch.script,
      request: "Critique the generated draft before saving.",
    });
    observations.push(critique);
    critiqueText = stringOutput(critique, "critique");
  }

  if (!shouldSaveScript({ prompt, snapshot: input.snapshot, mode })) {
    return {
      observations,
      finalResponse: [
        "Here is the draft. I did not save it because you asked me not to.",
        patch.script,
        critiqueText ? `Critique: ${critiqueText}` : "",
      ].filter(Boolean).join("\n\n"),
    };
  }

  const save = await runTool(input, "update_script_lab", patch);
  observations.push(save);

  if (save.status === "awaiting_approval") {
    return {
      observations,
      finalResponse: `Script package is ready, but approval is required before overwriting Script Lab: ${save.message}`,
    };
  }

  if (save.status !== "completed") {
    return {
      observations,
      finalResponse: `Script package generated, but I could not save it: ${save.message}`,
    };
  }

  return finishSavedScript(input, {
    observations,
    patch,
    prompt,
    critique: critiqueText,
    mode,
  });
}
