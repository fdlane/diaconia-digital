export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Diaconia Foundation API",
    version: "0.1.0",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": { description: "API is healthy" },
        },
      },
    },
    "/media/uploads": {
      post: {
        summary: "Create a signed image upload URL",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Signed upload URL" },
          "400": { description: "Invalid upload request" },
        },
      },
    },
    "/sessions": {
      post: {
        summary: "Submit or replay an offline facilitator session",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Session accepted" },
          "400": { description: "Invalid session" },
        },
      },
    },
    "/admin/sessions": {
      get: {
        summary: "List submitted sessions for admin review",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Session list" },
          "403": { description: "Admin role required" },
        },
      },
    },
    "/admin/sessions/{sessionId}/media": {
      get: {
        summary: "List signed media URLs for an admin session report",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Session media list" },
          "403": { description: "Admin role required" },
        },
      },
    },
    "/admin/sessions/{sessionId}/prayer-requests": {
      get: {
        summary: "List public prayer requests for an admin session report",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Prayer request list" },
          "403": { description: "Admin role required" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
} as const;
