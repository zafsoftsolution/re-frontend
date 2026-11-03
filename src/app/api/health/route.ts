// Liveness probe for the Docker HEALTHCHECK (see Dockerfile). Must stay cheap
// and must never depend on the Django backend being reachable.
export function GET() {
  return Response.json(
    { status: "ok", service: "rakib-enterprise-frontend" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
