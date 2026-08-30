export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SafeBid API",
    version: "0.1.0",
    description:
      "Hyperlocal community feed, verified services marketplace, escrow payments, and ID verification.",
  },
  servers: [{ url: "/api", description: "Current origin" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: { summary: "Health check", security: [], responses: { "200": { description: "OK" } } },
    },
    "/auth/register": {
      post: { summary: "Register with email/password", security: [], responses: { "201": { description: "Created" } } },
    },
    "/auth/login": {
      post: { summary: "Login", security: [], responses: { "200": { description: "OK" } } },
    },
    "/auth/refresh": {
      post: { summary: "Rotate refresh token", security: [], responses: { "200": { description: "OK" } } },
    },
    "/auth/logout": { post: { summary: "Logout", responses: { "200": { description: "OK" } } } },
    "/auth/google": { post: { summary: "Google OAuth ID token login", security: [], responses: { "200": { description: "OK" } } } },
    "/auth/apple": { post: { summary: "Apple identity token login", security: [], responses: { "200": { description: "OK" } } } },
    "/users/me": {
      get: { summary: "Current user", responses: { "200": { description: "OK" } } },
      patch: { summary: "Update profile", responses: { "200": { description: "OK" } } },
    },
    "/posts": {
      get: { summary: "Geo feed", security: [], responses: { "200": { description: "OK" } } },
      post: { summary: "Create post", responses: { "201": { description: "Created" } } },
    },
    "/services": {
      get: { summary: "List nearby services", security: [], responses: { "200": { description: "OK" } } },
      post: { summary: "Create service (verified providers)", responses: { "201": { description: "Created" } } },
    },
    "/jobs/rates": {
      get: {
        summary: "Neighborhood rate card (fair posted prices)",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },
    "/jobs": {
      get: { summary: "Open jobs nearby", security: [], responses: { "200": { description: "OK" } } },
      post: { summary: "Post a job at a locked fair price", responses: { "201": { description: "Created" } } },
    },
    "/jobs/{id}/claim": {
      post: { summary: "Verified provider takes the job at the posted price", responses: { "201": { description: "Created" } } },
    },
    "/bookings": {
      get: { summary: "List bookings", responses: { "200": { description: "OK" } } },
      post: { summary: "Create booking", responses: { "201": { description: "Created" } } },
    },
    "/bookings/{id}/confirm": { post: { summary: "Provider confirms job", responses: { "200": { description: "OK" } } } },
    "/bookings/{id}/start": { post: { summary: "Mark in progress", responses: { "200": { description: "OK" } } } },
    "/bookings/{id}/complete": { post: { summary: "Mark completed", responses: { "200": { description: "OK" } } } },
    "/bookings/{id}/review": { post: { summary: "Review and release escrow", responses: { "200": { description: "OK" } } } },
    "/bookings/{id}/cancel": { post: { summary: "Cancel and refund escrow", responses: { "200": { description: "OK" } } } },
    "/payments/bookings/{id}/intent": { post: { summary: "Create payment / escrow funds", responses: { "200": { description: "OK" } } } },
    "/payments/wallet": { get: { summary: "Wallet + ledger", responses: { "200": { description: "OK" } } } },
    "/payments/connect/onboard": { post: { summary: "Stripe Connect onboarding", responses: { "200": { description: "OK" } } } },
    "/payments/withdraw": { post: { summary: "Withdraw available balance", responses: { "201": { description: "Created" } } } },
    "/identity/session": { post: { summary: "Start Stripe Identity verification", responses: { "200": { description: "OK" } } } },
    "/admin/stats": { get: { summary: "Admin dashboard stats", responses: { "200": { description: "OK" } } } },
  },
};
