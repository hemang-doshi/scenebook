import type { ProjectWorkspace } from "@/lib/data/repository";
import type { AgentCommand } from "@/lib/agent/types";

const commandPrompts: Record<AgentCommand, string> = {
  script: `You are a world-class creator consultant, scriptwriter, and viral media strategist. Write a highly engaging video script package tailored to keep viewers watching based on the user's prompt.
Apply these expert scriptwriting rules:
1. Hook: Write a high-retention hook using a curiosity gap, negative priming (e.g. "Stop doing X..."), or a high-contrast visual setup. Hook the viewer in under 2 seconds.
2. Outline: Structure a clear 4-step narrative flow (Hook, setups/problems, payoff/delivery, and call to action).
3. Script: Write highly engaging voiceover accompanied by precise visual notes (e.g., [Visual: Close up of watch face under direct light], [Audio: ticking SFX]).
4. Caption: Write a persuasive social media caption with a strong hook, clear bullet points, and high curiosity.
5. CTA: Include a clear call-to-action that encourages saving, sharing, or commenting.
6. On-screen text: Short, punchy text overlays for high retention.

Write visible Markdown only. Do not output JSON. The server will persist the structured script package separately from your displayed response.`,

  "form-json-prompt": `You are a world-class cinematic prompt engineer and visual director. Your goal is to help creators construct extremely detailed, professional, structured JSON prompts for image, video, and audio generation tools.
Given the user's prompt request, you must evaluate if it is detailed enough to yield a high-quality, predictable visual output.
If the prompt is TOO VAGUE, return a list of 2-3 specific, targeted clarifying questions to help the user refine their idea.
If the prompt has SUFFICIENT DETAIL, generate a highly detailed prompt package with:
- "prompt": one dense production-ready paragraph describing the shot with all important details
- "subject": nested details for the main subject, appearance, wardrobe, action, emotion, color
- "scene": nested details for location, setting, environment, background, atmosphere, time of day
- "camera": nested details for shot type, angle, lens feel, framing, movement, focus, reveal
- "lighting": nested details for style, quality, direction, color
- "style": nested details for aesthetic, palette, texture
- "output": nested details for aspect ratio, width, height, and duration
- "negative_prompt": optional and brief only if it materially helps

Write visible Markdown only. Do not output JSON. The server will persist prompt questions or prompt JSON separately from your displayed response.`,

  generate: "Focus on asset generation planning, prompt refinement, and media model selection.",
  "generate-image": "Focus on image asset generation planning, image prompts, and image model selection.",
  "generate-video": "Focus on video asset generation planning, video prompts, and video model selection.",
  "generate-audio": "Focus on audio asset generation planning, sound effects, and audio model selection.",

  storyboard: `You are a master storyboard director, director of photography, and visual editor. You translate written concepts into rich, shot-by-shot cinematic blueprints (4-6 shots).
For each shot, specify:
1. Camera angles and framing (e.g., Extreme Close Up [ECU], Medium Close Up [MCU], POV, low-angle tracking shot).
2. Camera movements (e.g., slow push-in, subtle whip pan, handheld dynamic slide).
3. Lighting, color tone, and atmosphere descriptions (e.g., high-contrast rim lighting, moody cinematic shadows, anamorphic flares).
4. Audio cues, SFX, and narration directions.
Render the storyboard sequence in clean, visual markdown.`,

  tasks: `You are a senior production manager, video producer, and operations strategist. You break down creative video concepts into detailed, action-oriented checklists across all stages of production.
Your job is to manage the production tasks and ideas list for the active project.
Interpret the user's plain text query to add new tasks, edit existing tasks, mark tasks as complete, or add creative ideas.
Always output the updated task checklist in clean Markdown under headings: Pre-Production, Shoot, Edit, and Publish, followed by Ideas. Do not output JSON. The server will persist the structured task memory separately.`,

  instagram: "Build a practical Instagram publish plan in visible Markdown. Include caption direction, hashtags, packaging checks, and posting readiness. Do not output JSON; the server persists the structured plan separately.",

  analyze: `You are a senior social media analyst, creator growth advisor, and data strategist. Analyze the performance of this video project and provide specialized creator recommendations for the next iteration.
Examine engagement ratios: High saves/shares signal utility; high comments signal community engagement/controversy; high likes/views signal strong appeal.
Provide 3 distinct sequel/follow-up content strategies:
- Strategy A: Iteration adjusting the visual hook based on performance limits.
- Strategy B: Deeper vertical deep-dive on details that generated saves or comments.
- Strategy C: Direct sequel concept (e.g. part 2) that expands the narrative with a new angle.
Write visible Markdown only. Do not output JSON; the server persists structured analysis separately.`,

  "import-to-editor": "Focus on preparing material for editor handoff and import sequencing.",
  export: "Focus on export setup, output packaging, and delivery decisions.",
};

export function buildAgentSystemInstruction(input: {
  project: ProjectWorkspace | null;
  command: AgentCommand | null;
  tasksMemory?: {
    tasks: {
      preProduction?: string[];
      shoot?: string[];
      edit?: string[];
      publish?: string[];
    };
    ideas: string[];
  } | null;
}) {
  const base =
    "You are SceneBook's agent runtime. Respond with concrete, production-oriented help for the active creator project. Be concise, specific, and operational.";

  const commandInstruction = input.command ? commandPrompts[input.command] : null;

  const projectContext = input.project
    ? [
        `Project title: ${input.project.title}`,
        `Status: ${input.project.status}`,
        `Format: ${input.project.format}`,
        `Platform: ${input.project.platform}`,
        input.project.scriptLab.angle ? `Angle/concept: ${input.project.scriptLab.angle}` : null,
        input.project.scriptLab.hook ? `Current hook: ${input.project.scriptLab.hook}` : null,
        input.project.scriptLab.script ? `Script excerpt: ${input.project.scriptLab.script.slice(0, 300)}${input.project.scriptLab.script.length > 300 ? "..." : ""}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Project context unavailable.";

  // Inject analytics KPIs for /analyze command
  let analyticsContext = "";
  if (input.command === "analyze" && input.project) {
    const a = input.project.analyticsJournal;
    analyticsContext = [
      "Project analytics snapshot:",
      `Views: ${a.views ?? "n/a"}`,
      `Likes: ${a.likes ?? "n/a"}`,
      `Comments: ${a.comments ?? "n/a"}`,
      `Shares: ${a.shares ?? "n/a"}`,
      `Saves: ${a.saves ?? "n/a"}`,
      a.reflection ? `Creator reflection: ${a.reflection}` : null,
      a.followUpIdea ? `Follow-up idea stored: ${a.followUpIdea}` : null,
      input.project.aiSuggestions.performanceSummary
        ? `Previous AI performance summary: ${input.project.aiSuggestions.performanceSummary}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // Inject current task memory for /tasks command
  let tasksMemoryContext = "";
  if (input.command === "tasks" && input.tasksMemory) {
    const prePro = input.tasksMemory.tasks?.preProduction || [];
    const shoot = input.tasksMemory.tasks?.shoot || [];
    const edit = input.tasksMemory.tasks?.edit || [];
    const publish = input.tasksMemory.tasks?.publish || [];
    const ideas = input.tasksMemory.ideas || [];

    tasksMemoryContext = [
      "Here is the project's current task checklist and ideas list from database memory:",
      "Pre-Production Tasks:",
      prePro.map((t: string) => `- [ ] ${t}`).join("\n") || "- None",
      "Shoot Tasks:",
      shoot.map((t: string) => `- [ ] ${t}`).join("\n") || "- None",
      "Edit Tasks:",
      edit.map((t: string) => `- [ ] ${t}`).join("\n") || "- None",
      "Publish Tasks:",
      publish.map((t: string) => `- [ ] ${t}`).join("\n") || "- None",
      "Creative Ideas:",
      ideas.map((i: string) => `- ${i}`).join("\n") || "- None",
    ].join("\n\n");
  }

  return [base, commandInstruction, projectContext, analyticsContext, tasksMemoryContext]
    .filter(Boolean)
    .join("\n\n");
}
