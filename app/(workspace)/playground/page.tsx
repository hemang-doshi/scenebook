/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { 
  Sparkles, 
  Send, 
  Loader2, 
  BookmarkPlus, 
  Wrench, 
  MessageSquare,
  Inbox,
  FileCheck
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { fetchJson } from "@/lib/fetcher";

const models = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
];

const systemPresets = {
  custom: "You are a helpful creative writing assistant.",
  hook: "You are a viral hook writer. Craft attention-grabbing cold opens (under 15 words) for short-form video formats.",
  outline: "You are a creative director. Structure clean visual outlines and pacing beats for youtube shorts or reels.",
  script: "You are a scriptwriter. Write engaging, natural spoken voiceover narration alongside visual shot descriptions.",
  cta: "You are a conversion marketer. Write short, compelling, action-oriented call to actions (CTAs) for social media.",
};

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function PlaygroundPage() {
  const { data, refresh } = useWorkspaceSnapshot();
  const [model, setModel] = useState("gemini-2.5-flash");
  const [preset, setPreset] = useState<keyof typeof systemPresets>("custom");
  const [systemInstruction, setSystemInstruction] = useState(systemPresets.custom);
  const [useCreatorContext, setUseCreatorContext] = useState(true);
  
  const [prompt, setPrompt] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Link suggestion states
  const [targetCardId, setTargetCardId] = useState("");
  const [targetField, setTargetField] = useState("hook");
  const [isLinking, setIsLinking] = useState(false);

  // Sync default target card
  useEffect(() => {
    if (data?.cards && data.cards.length > 0 && !targetCardId) {
      setTargetCardId(data.cards[0].id);
    }
  }, [data, targetCardId]);

  // Sync preset instructions
  const handlePresetChange = (p: keyof typeof systemPresets) => {
    setPreset(p);
    setSystemInstruction(systemPresets[p]);
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || isGenerating) return;

    const userMsg = prompt;
    setPrompt("");
    setChatLog((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsGenerating(true);

    try {
      const res = await fetchJson<{ text: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          prompt: userMsg,
          systemInstruction,
          modelOverride: model,
          // Note: context inclusion is managed by the server API dynamically querying database
        }),
      });

      setChatLog((prev) => [...prev, { role: "ai", content: res.text }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        { role: "ai", content: "Error: Generation failed. Please check your API keys in Settings." },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLinkAsAsset = async (msgIndex: number, text: string) => {
    if (!targetCardId) return;
    setIsLinking(true);
    try {
      await fetchJson(`/api/cards/${targetCardId}/assets`, {
        method: "POST",
        body: JSON.stringify({
          title: `Playground Asset (${preset.toUpperCase()})`,
          url: "text-overlay-placeholder",
          type: "document",
          note: text,
        }),
      });
      alert("Successfully linked suggestion as a card asset!");
      refresh();
    } catch (err) {
      alert("Failed to link asset: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLinking(false);
    }
  };

  const handleApplyToSection = async (msgIndex: number, text: string) => {
    if (!targetCardId) return;
    setIsLinking(true);
    try {
      // Fetch active card lab details first
      const card = data?.cards.find((c) => c.id === targetCardId);
      if (!card) throw new Error("Card not found");

      const updatedScriptLab = {
        ...card.scriptLab,
        [targetField]: text,
      };

      await fetchJson(`/api/cards/${targetCardId}`, {
        method: "PATCH",
        body: JSON.stringify({ scriptLab: updatedScriptLab }),
      });

      alert(`Successfully updated script section: ${targetField.toUpperCase()}!`);
      refresh();
    } catch (err) {
      alert("Failed to update card section: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLinking(false);
    }
  };

  const handleCaptureAsInbox = async (msgIndex: number, text: string) => {
    setIsLinking(true);
    try {
      await fetchJson("/api/inbox", {
        method: "POST",
        body: JSON.stringify({
          title: text.split("\n")[0].slice(0, 50) || "AI Captured Idea",
          notes: text,
          sourceType: "text",
        }),
      });
      alert("Successfully captured to Inbox!");
      refresh();
    } catch (err) {
      alert("Failed to capture: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeading
        eyebrow="Playground"
        title="AI Creative Workspace"
        description="Select specific models, test custom instructions, and map generated answers back into your active card beats."
      />

      <div className="cmd-grid xl:grid-cols-[280px_1fr] gap-6 flex-1 min-h-[500px]">
        
        {/* Left Column: AI Parameters Controls */}
        <Panel className="border-border bg-surface-soft space-y-6">
          <div>
            <span className="cmd-label text-accent flex items-center gap-1.5 mb-3">
              <Wrench className="h-3.5 w-3.5" /> Model Engine
            </span>
            <CustomSelect
              value={model}
              onChange={setModel}
              options={models.map((m) => ({ value: m.id, label: m.label }))}
            />
          </div>

          <div>
            <span className="cmd-label text-accent flex items-center gap-1.5 mb-3">
              <MessageSquare className="h-3.5 w-3.5" /> Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(systemPresets).map((key) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key as keyof typeof systemPresets)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase border transition cursor-pointer ${
                    preset === key 
                      ? "border-accent bg-accent/15 text-accent" 
                      : "border-border bg-black/20 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="cmd-label text-accent flex items-center gap-1.5 mb-3">
              System Instruction
            </span>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full h-32 bg-black/30 border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <span className="text-xs text-muted-foreground font-mono">Use Creator Profile</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={useCreatorContext}
                onChange={() => setUseCreatorContext(!useCreatorContext)}
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-foreground"></div>
            </label>
          </div>
        </Panel>

        {/* Right Column: Dynamic Chat Space */}
        <Panel className="border-border bg-surface-soft flex flex-col justify-between min-h-[500px]">
          
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto ed-scrollbar bg-black/15 rounded-xl p-4 space-y-4 mb-4">
            {chatLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <Sparkles className="h-8 w-8 text-accent animate-pulse mb-3" />
                <h4 className="text-sm font-semibold text-foreground">AI Creative Sandbox</h4>
                <p className="text-xs text-muted max-w-md mt-2 leading-relaxed">
                  Start prompting the assistant. Use presets in the sidebar to specialize generations. 
                  Link generated responses back into project documents or inbox captures.
                </p>
              </div>
            ) : (
              chatLog.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start animate-[ed-fadeIn_0.25s_ease-out]"}`}>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                    {msg.role === "user" ? "Creator" : "AI"}
                  </span>
                  <div className={`p-4 rounded-xl text-xs leading-relaxed max-w-[80%] whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-accent/15 border border-accent/25 text-foreground" 
                      : "bg-surface-contrast border border-border text-foreground"
                  }`}>
                    {msg.content}
                  </div>

                  {msg.role === "ai" && !msg.content.startsWith("Error:") && (
                    <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-2 border-t border-border/10 w-full max-w-[80%]">
                      
                      {/* Link to project actions */}
                      {data?.cards && data.cards.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 bg-black/20 p-2 rounded border border-border">
                          
                          <CustomSelect
                            value={targetCardId}
                            onChange={setTargetCardId}
                            options={data.cards.map((c) => ({ value: c.id, label: c.title }))}
                            className="w-[140px]"
                            triggerClassName="bg-transparent border-0 h-6 px-1 hover:border-0 hover:bg-white/5 py-0"
                            dropdownClassName="w-[180px]"
                          />

                          <CustomSelect
                            value={targetField}
                            onChange={setTargetField}
                            options={[
                              { value: "angle", label: "Angle" },
                              { value: "hook", label: "Hook" },
                              { value: "outline", label: "Outline" },
                              { value: "script", label: "Script" },
                              { value: "caption", label: "Caption" },
                              { value: "notes", label: "Notes" },
                            ]}
                            className="w-[100px] border-l border-border pl-2 rounded-none"
                            triggerClassName="bg-transparent border-0 h-6 px-1 hover:border-0 hover:bg-white/5 py-0"
                            dropdownClassName="w-[120px]"
                          />

                          <button
                            disabled={isLinking}
                            onClick={() => handleApplyToSection(i, msg.content)}
                            className="text-[10px] font-mono text-accent hover:text-accent-secondary uppercase font-bold flex items-center gap-1 cursor-pointer border-l border-border pl-2"
                          >
                            {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3" />}
                            Apply Section
                          </button>

                          <button
                            disabled={isLinking}
                            onClick={() => handleLinkAsAsset(i, msg.content)}
                            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 uppercase font-bold flex items-center gap-1 cursor-pointer border-l border-border pl-2"
                          >
                            {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookmarkPlus className="h-3 w-3" />}
                            Link Asset
                          </button>

                        </div>
                      )}

                      <button
                        disabled={isLinking}
                        onClick={() => handleCaptureAsInbox(i, msg.content)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase font-semibold flex items-center gap-1 cursor-pointer bg-black/25 px-2.5 py-2 rounded border border-border"
                      >
                        <Inbox className="h-3 w-3" /> Capture Idea
                      </button>

                    </div>
                  )}
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Prompt Entry Box */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
              placeholder="Ask creative assistant for ideas, scripts, or hooks..."
              className="flex-1 bg-black/35 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
             <Button className="h-10 w-10 px-0 rounded-xl" onClick={handleSendPrompt} disabled={isGenerating || !prompt.trim()}>
               <Send className="h-4.5 w-4.5" />
             </Button>
          </div>

        </Panel>

      </div>
    </div>
  );
}
