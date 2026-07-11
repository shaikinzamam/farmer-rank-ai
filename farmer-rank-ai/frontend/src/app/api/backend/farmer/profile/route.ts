const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/farmer/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("[frontend proxy /api/backend/farmer/profile] failed:", error);
    return Response.json(
      { error: "Backend unreachable", detail: error instanceof Error ? error.message : "Unknown proxy error" },
      { status: 502 }
    );
  }
}
