import { describe, expect, it } from "vitest";

import { googleParamsSchema, openAIParamsSchema, xaiParamsSchema } from "../src/schemas.js";

describe("tool schemas", () => {
  it("uses flexible model strings instead of provider allowlists", () => {
    expect(openAIParamsSchema.parse({ prompt: "cat", model: "future-openai-image-model" }).model).toBe("future-openai-image-model");
    expect(googleParamsSchema.parse({ prompt: "cat", model: "future-google-image-model" }).model).toBe("future-google-image-model");
    expect(xaiParamsSchema.parse({ prompt: "cat", model: "future-xai-image-model" }).model).toBe("future-xai-image-model");
  });

  it("defaults return mode to file", () => {
    expect(openAIParamsSchema.parse({ prompt: "cat" }).return_mode).toBe("file");
  });

  it("rejects empty prompts", () => {
    expect(() => googleParamsSchema.parse({ prompt: "" })).toThrow();
  });
});
