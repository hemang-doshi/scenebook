import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { env } from "../env";
import { getActiveProviderToken, type CreatorSettingsRow } from "@/lib/creator-settings";
import { getChatModelPresets, type ChatModelPreset } from "@/lib/ai/model-registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChatProvider = ChatModelPreset["provider"];

export function getProviderOrderForModel(modelOverride?: string): Array<{ provider: ChatProvider; model: string }> {
  const presets = getChatModelPresets();
  const selected = modelOverride ? presets.find((preset) => preset.id === modelOverride) : null;
  const defaultByProvider: Record<ChatProvider, string> = {
    gemini: "gemini-2.5-flash",
    openrouter: "google/gemini-2.5-flash",
    nim: env.nimModel || "meta/llama-3.1-70b-instruct",
  };
  const providerOrder: ChatProvider[] = selected
    ? [selected.provider, "gemini", "openrouter", "nim"]
    : ["gemini", "openrouter", "nim"];
  const deduped = providerOrder.filter((provider, index) => providerOrder.indexOf(provider) === index);

  return deduped.map((provider) => ({
    provider,
    model: selected?.provider === provider ? selected.id : defaultByProvider[provider],
  }));
}

function isValidApiKey(key: string): boolean {
  if (!key) return false;
  const k = key.trim().toLowerCase();
  return (
    !k.startsWith("your_") &&
    !k.includes("placeholder") &&
    k !== "example" &&
    k.length > 5
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function generateText({
  prompt,
  systemInstruction,
  modelOverride, // Allow overriding the model dynamically in playground
}: {
  prompt: string;
  systemInstruction?: string;
  modelOverride?: string;
}): Promise<string> {
  let customGeminiKey = "";
  let customOpenRouterKey = "";
  let customNimKey = "";
  let creatorContext = "";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("creator_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const row = data as CreatorSettingsRow;
        customGeminiKey = getActiveProviderToken(row, "gemini");
        customOpenRouterKey = getActiveProviderToken(row, "openrouter");
        customNimKey = getActiveProviderToken(row, "nim");
        creatorContext = row.creator_context || "";
      }
    }
  } catch (err) {
    console.warn("Could not retrieve custom creator settings from Supabase, using defaults:", err);
  }

  const activeGeminiKey = customGeminiKey || env.geminiApiKey;
  const activeOpenRouterKey = customOpenRouterKey || env.openrouterApiKey;
  const activeNimKey = customNimKey || env.nimApiKey;

  // Append creator context to system instructions for text generation
  let finalSystemInstruction = systemInstruction || "";
  if (creatorContext) {
    finalSystemInstruction = `${finalSystemInstruction}\n\nCreator context & background:\n${creatorContext}`.trim();
  }

  for (const route of getProviderOrderForModel(modelOverride)) {
    if (route.provider === "gemini" && isValidApiKey(activeGeminiKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeGeminiKey });
        const response = await withTimeout(
          ai.models.generateContent({
            model: route.model,
            contents: prompt,
            config: finalSystemInstruction ? { systemInstruction: finalSystemInstruction } : undefined,
          }),
          10000,
          "Gemini API request timed out"
        );
        if (response.text) {
          return response.text;
        }
      } catch (e) {
        console.error("Gemini AI API error:", e);
      }
    }

    if (route.provider === "openrouter" && isValidApiKey(activeOpenRouterKey)) {
      try {
        const client = new OpenAI({
          apiKey: activeOpenRouterKey,
          baseURL: "https://openrouter.ai/api/v1",
        });
        const response = await withTimeout(
          client.chat.completions.create({
            model: route.model,
            messages: [
              ...(finalSystemInstruction ? [{ role: "system" as const, content: finalSystemInstruction }] : []),
              { role: "user" as const, content: prompt },
            ],
            temperature: 0.7,
          }),
          10000,
          "OpenRouter API request timed out"
        );
        const text = response.choices[0]?.message?.content;
        if (text) {
          return text;
        }
      } catch (e) {
        console.error("OpenRouter API error:", e);
      }
    }

    if (route.provider === "nim" && isValidApiKey(activeNimKey) && env.nimBaseUrl) {
      try {
        const client = new OpenAI({
          apiKey: activeNimKey,
          baseURL: env.nimBaseUrl,
        });
        const response = await withTimeout(
          client.chat.completions.create({
            model: route.model,
            messages: [
              ...(finalSystemInstruction ? [{ role: "system" as const, content: finalSystemInstruction }] : []),
              { role: "user" as const, content: prompt },
            ],
            temperature: 0.7,
          }),
          10000,
          "NVIDIA NIM API request timed out"
        );
        const text = response.choices[0]?.message?.content;
        if (text) {
          return text;
        }
      } catch (e) {
        console.error("NVIDIA NIM API error:", e);
      }
    }
  }

  // Fallback / Mock responses if no key is configured
  console.warn("No active AI provider API key found. Falling back to mock generator.");
  return getMockResponse(prompt);
}

export async function* generateTextStream({
  prompt,
  systemInstruction,
  modelOverride,
}: {
  prompt: string;
  systemInstruction?: string;
  modelOverride?: string;
}): AsyncGenerator<string, void, unknown> {
  let customGeminiKey = "";
  let customOpenRouterKey = "";
  let customNimKey = "";
  let creatorContext = "";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("creator_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const row = data as CreatorSettingsRow;
        customGeminiKey = getActiveProviderToken(row, "gemini");
        customOpenRouterKey = getActiveProviderToken(row, "openrouter");
        customNimKey = getActiveProviderToken(row, "nim");
        creatorContext = row.creator_context || "";
      }
    }
  } catch (err) {
    console.warn("Could not retrieve custom creator settings from Supabase, using defaults:", err);
  }

  const activeGeminiKey = customGeminiKey || env.geminiApiKey;
  const activeOpenRouterKey = customOpenRouterKey || env.openrouterApiKey;
  const activeNimKey = customNimKey || env.nimApiKey;

  let finalSystemInstruction = systemInstruction || "";
  if (creatorContext) {
    finalSystemInstruction = `${finalSystemInstruction}\n\nCreator context & background:\n${creatorContext}`.trim();
  }

  for (const route of getProviderOrderForModel(modelOverride)) {
    if (route.provider === "gemini" && isValidApiKey(activeGeminiKey)) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeGeminiKey });
        const responseStream = await ai.models.generateContentStream({
          model: route.model,
          contents: prompt,
          config: finalSystemInstruction ? { systemInstruction: finalSystemInstruction } : undefined,
        });
        for await (const chunk of responseStream) {
          if (chunk.text) {
            yield chunk.text;
          }
        }
        return;
      } catch (e) {
        console.error("Gemini AI API error in stream:", e);
      }
    }

    if (route.provider === "openrouter" && isValidApiKey(activeOpenRouterKey)) {
      try {
        const client = new OpenAI({
          apiKey: activeOpenRouterKey,
          baseURL: "https://openrouter.ai/api/v1",
        });
        const responseStream = await client.chat.completions.create({
          model: route.model,
          messages: [
            ...(finalSystemInstruction ? [{ role: "system" as const, content: finalSystemInstruction }] : []),
            { role: "user" as const, content: prompt },
          ],
          temperature: 0.7,
          stream: true,
        });
        for await (const chunk of responseStream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            yield text;
          }
        }
        return;
      } catch (e) {
        console.error("OpenRouter API error in stream:", e);
      }
    }

    if (route.provider === "nim" && isValidApiKey(activeNimKey) && env.nimBaseUrl) {
      try {
        const client = new OpenAI({
          apiKey: activeNimKey,
          baseURL: env.nimBaseUrl,
        });
        const responseStream = await client.chat.completions.create({
          model: route.model,
          messages: [
            ...(finalSystemInstruction ? [{ role: "system" as const, content: finalSystemInstruction }] : []),
            { role: "user" as const, content: prompt },
          ],
          temperature: 0.7,
          stream: true,
        });
        for await (const chunk of responseStream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            yield text;
          }
        }
        return;
      } catch (e) {
        console.error("NVIDIA NIM API error in stream:", e);
      }
    }
  }

  // Fallback / Mock responses if no key is configured (Stream simulation)
  console.warn("No active AI provider API key found. Falling back to mock generator.");
  const mockText = getMockResponse(prompt);
  const words = mockText.split(" ");
  for (const word of words) {
    yield word + " ";
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

function getMockResponse(prompt: string): string {
  const lowercasePrompt = prompt.toLowerCase();
  if (lowercasePrompt.includes("hook")) {
    return [
      "The cinematic settings mistake I stopped making.",
      "Three settings that made my footage look twice as expensive.",
      "Stop adjusting gain. Fix this instead.",
      "The lighting hack nobody talks about.",
      "This single menu change saved my talking-head edits.",
    ].join("\n");
  } else if (lowercasePrompt.includes("shot") || lowercasePrompt.includes("b-roll")) {
    return [
      "A-Roll desk intro looking directly at camera.",
      "B-Roll close-up of camera lens ring rotating.",
      "B-Roll hands typing on keyboard with warm rim light.",
      "B-Roll adjusting the desk lamp placement.",
      "A-Roll desk outro with final graded before/after split.",
    ].join("\n");
  } else if (lowercasePrompt.includes("caption")) {
    return [
      "The camera setup hack I wish I knew sooner.",
      "Zero dollar lighting upgrade for content creators.",
      "Gain staging explained in 15 seconds.",
      "Save this for your next cinematic shoot.",
    ].join("\n");
  } else if (lowercasePrompt.includes("rewrite")) {
    return [
      "Here is three ways to adjust this tone.",
      "Alternate Tone 1: Dynamic & Urgent. Let's make it punchy.",
      "Alternate Tone 2: Educational & Direct. Clear settings, no fluff.",
      "Alternate Tone 3: Storyteller. Why I spent 3 years doing this wrong.",
    ].join("\n");
  } else if (lowercasePrompt.includes("voiceover") || lowercasePrompt.includes("voice over")) {
    return "So I was looking at my footage, and it looked terrible. I realized it was not the camera, it was just these three settings. Let me show you how to fix it.";
  } else if (lowercasePrompt.includes("thumbnail")) {
    return "Split screen before and after, showing a muddy green shot side-by-side with a vibrant warm cinematic shot. Text overlay: 'FIX THIS'.";
  }
  return "AI generated placeholder response for: " + prompt.slice(0, 100);
}
