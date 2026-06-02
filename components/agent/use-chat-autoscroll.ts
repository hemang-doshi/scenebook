import { useCallback, useEffect, useRef } from "react";

export function useChatAutoscroll<TDependency>(dependency: TDependency, active: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 96;
  }, []);

  useEffect(() => {
    if (!active && !pinnedToBottomRef.current) return;
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, [dependency, active]);

  return {
    containerRef,
    bottomRef,
    handleScroll,
  };
}
