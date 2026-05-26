import { NextResponse } from "next/server";

import { createProject } from "@/lib/data/repository";
import { createProjectSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = createProjectSchema.parse(await request.json());
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to create project." },
      { status: 400 },
    );
  }
}
