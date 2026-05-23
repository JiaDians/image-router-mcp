import { describe, expect, it } from "vitest";

import { generateGoogleImage } from "../src/providers/google.js";
import { generateOpenAIImage } from "../src/providers/openai.js";
import { generateXAIImage } from "../src/providers/xai.js";
import type { GoogleParams, OpenAIParams, XAIParams } from "../src/schemas.js";

const tinyPng = Buffer.from("image").toString("base64");

describe("providers", () => {
  it("builds OpenAI generation requests with flexible models", async () => {
    const calls: unknown[] = [];
    const client = {
      images: {
        generate: async (body: unknown) => {
          calls.push(body);
          return { created: 1, data: [{ b64_json: tinyPng }] };
        },
        edit: async () => {
          throw new Error("unexpected edit");
        },
      },
    };

    const params: OpenAIParams = {
      prompt: "cat",
      model: "future-openai-model",
      output_format: "png",
      return_mode: "file",
      inline_max_bytes: 1024,
    };
    const result = await generateOpenAIImage(params, client);

    expect(result.model).toBe("future-openai-model");
    expect(calls[0]).toMatchObject({ model: "future-openai-model", prompt: "cat", response_format: "b64_json" });
  });

  it("extracts Google inline image parts", async () => {
    const client = {
      models: {
        generateContent: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { data: tinyPng, mimeType: "image/png" } }] } }],
          modelVersion: "test-version",
        }),
      },
    };
    const params: GoogleParams = {
      prompt: "cat",
      model: "gemini-test",
      return_mode: "file",
      inline_max_bytes: 1024,
    };

    const result = await generateGoogleImage(params, client);

    expect(result.provider).toBe("google");
    expect(result.images[0]?.mimeType).toBe("image/png");
  });

  it("calls xAI JSON image generation endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ data: [{ b64_json: tinyPng, mime_type: "image/png" }] }), { status: 200 });
    };
    const previousKey = process.env.XAI_API_KEY;
    process.env.XAI_API_KEY = "test-key";
    try {
      const params: XAIParams = {
        prompt: "cat",
        model: "grok-test",
        return_mode: "file",
        inline_max_bytes: 1024,
      };
      const result = await generateXAIImage(params, fetchImpl);

      expect(result.model).toBe("grok-test");
      expect(calls[0]?.url).toBe("https://api.x.ai/v1/images/generations");
      expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({ model: "grok-test", response_format: "b64_json" });
    } finally {
      if (previousKey === undefined) {
        delete process.env.XAI_API_KEY;
      } else {
        process.env.XAI_API_KEY = previousKey;
      }
    }
  });
});
