import { serve } from "./deps.ts";

function handler(req: Request) {
  // const url = new URL(req.url);
  // const code = url.searchParams.get("code");
  const token = req.headers.get("Authorization");

  if (token != `Bearer ${Deno.env.get("API_TOKEN")}`) {
    return new Response("Not authorized", { status: 401 });
  }

  return new Response("OK", { status: 200 });
}

serve(handler);
