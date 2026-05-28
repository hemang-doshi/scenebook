import { NextResponse } from "next/server";
import { z } from "zod";

import { seedDevTestUser } from "@/lib/dev/seed-test-user";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid seed payload." }, { status: 400 });
  }

  const result = await seedDevTestUser(payload.data);

  return NextResponse.json(result);
}
