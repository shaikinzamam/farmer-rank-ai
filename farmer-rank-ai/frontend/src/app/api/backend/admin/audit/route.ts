const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const response = await fetch(`${BACKEND_URL}/admin/audit?${url.searchParams.toString()}`, {
      headers: { "x-demo-role": request.headers.get("x-demo-role") || "buyer" },
      cache: "no-store",
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("[frontend proxy /api/backend/admin/audit] failed:", error);
    return Response.json(
      { error: "Backend unreachable", detail: error instanceof Error ? error.message : "Unknown proxy error" },
      { status: 502 }
    );
  }
}
