export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Diaconia Foundation API",
    version: "0.2.0",
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
    "/meetings": {
      get: {
        summary: "List meetings visible to the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Meeting list" },
          "403": { description: "Invited active user required" },
        },
      },
      post: {
        summary: "Submit or replay an offline field meeting",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Meeting accepted" },
          "400": { description: "Invalid meeting" },
        },
      },
    },
    "/meetings/{meetingId}": {
      get: {
        summary: "Get a meeting report",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Meeting detail" },
          "404": { description: "Meeting not found" },
        },
      },
    },
    "/meetings/{meetingId}/media": {
      get: {
        summary: "List signed media URLs for a meeting report",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Meeting media list" },
        },
      },
    },
    "/meetings/{meetingId}/prayer-requests": {
      get: {
        summary: "List text-only prayer requests for a meeting report",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Prayer request list" },
        },
      },
    },
    "/groups": {
      get: {
        summary: "List groups visible to the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Group list" },
        },
      },
    },
    "/users": {
      get: {
        summary: "List users for administration",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "User list" },
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
