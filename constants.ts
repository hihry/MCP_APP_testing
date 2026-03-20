import type { ParsedSpec, ApiEndpoint } from "./types.js";

export const BASE_URL = "https://jsonplaceholder.typicode.com";

// ─── Hardcoded JSONPlaceholder OpenAPI Spec (simplified) ───────────────────
// In the full system this comes from SpecParser ingesting a real YAML/JSON file

export const JSONPLACEHOLDER_SPEC: ParsedSpec = {
  title: "JSONPlaceholder API",
  baseUrl: BASE_URL,
  version: "1.0.0",
  sessionId: "",          // filled at runtime
  endpoints: [
    {
      method: "GET",
      path: "/users",
      summary: "List all users",
      parameters: [],
      responses: {
        "200": {
          description: "Array of user objects",
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:       { type: "integer" },
                name:     { type: "string" },
                username: { type: "string" },
                email:    { type: "string" },
              },
            },
          },
        },
      },
      tags: ["users"],
    },
    {
      method: "GET",
      path: "/users/{id}",
      summary: "Get a user by ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", example: 1 },
          description: "User ID",
        },
      ],
      responses: {
        "200": {
          description: "User object",
          schema: {
            type: "object",
            properties: {
              id:       { type: "integer" },
              name:     { type: "string" },
              username: { type: "string" },
              email:    { type: "string" },
              address:  { type: "object" },
              phone:    { type: "string" },
              website:  { type: "string" },
              company:  { type: "object" },
            },
          },
        },
        "404": { description: "User not found" },
      },
      tags: ["users"],
    },
    {
      method: "GET",
      path: "/posts",
      summary: "List all posts",
      parameters: [
        {
          name: "userId",
          in: "query",
          required: false,
          schema: { type: "integer", example: 1 },
          description: "Filter posts by user ID",
        },
      ],
      responses: {
        "200": {
          description: "Array of post objects",
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:     { type: "integer" },
                userId: { type: "integer" },
                title:  { type: "string" },
                body:   { type: "string" },
              },
            },
          },
        },
      },
      tags: ["posts"],
    },
    {
      method: "POST",
      path: "/posts",
      summary: "Create a new post",
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: "object",
          required: ["title", "body", "userId"],
          properties: {
            title:  { type: "string" },
            body:   { type: "string" },
            userId: { type: "integer" },
          },
        },
        example: { title: "Test Post", body: "Hello world", userId: 1 },
      },
      responses: {
        "201": {
          description: "Created post object with generated ID",
          schema: {
            type: "object",
            properties: {
              id:     { type: "integer" },
              title:  { type: "string" },
              body:   { type: "string" },
              userId: { type: "integer" },
            },
          },
        },
      },
      tags: ["posts"],
    },
  ],
};

// ─── Drift Simulation ───────────────────────────────────────────────────────
// Simulates v2 of the API where user.id changed from integer → string
// This is what SelfHealingEngine detects in the POC

export const DRIFTED_USER_RESPONSE = {
  id: "usr_1",           // BREAKING: was integer 1, now string "usr_1"
  name: "Leanne Graham",
  username: "Bret",
  email: "Sincere@april.biz",
  address: {
    street: "Kulas Light",
    city: "Gwenborough",
  },
  phone: "1-770-736-0988 x56442",
  website: "hildegard.org",
  company: { name: "Romaguera-Crona" },
};

// The original assertion that breaks against drifted response
export const ORIGINAL_ID_ASSERTION = {
  field: "response.body.id",
  operator: "type_is" as const,
  expected: "integer",
};

// The healed assertion that works with the new response
export const HEALED_ID_ASSERTION = {
  field: "response.body.id",
  operator: "type_is" as const,
  expected: "string",
};

export const CHARACTER_LIMIT = 50_000;
