"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Panel } from "@/components/ui/panel";

export default function StudioRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (params.id) {
      router.replace(`/cards/${params.id}#studio`);
    }
  }, [params.id, router]);

  return (
    <Panel className="flex items-center justify-center py-20">
      <div className="text-center space-y-4">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted font-mono uppercase tracking-wider">
          Redirecting to Studio Workspace Hub...
        </p>
      </div>
    </Panel>
  );
}
