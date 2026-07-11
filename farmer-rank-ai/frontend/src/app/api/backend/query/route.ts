const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://backend:4000";

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-role": request.headers.get("x-demo-role") || "buyer",
      },
      body: JSON.stringify({ query: body.query }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }

    const errorData = await response.json().catch(() => null);
    return Response.json(
      {
        error: errorData?.error || "Backend request failed",
        detail: errorData?.detail || `Backend responded with ${response.status}`,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("[frontend proxy /api/backend/query] failed:", error);
    return Response.json(
      {
        error: "Backend request failed",
        detail: error instanceof Error ? error.message : "Unknown proxy error",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
