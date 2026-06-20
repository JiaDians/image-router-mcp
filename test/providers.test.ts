import { describe, expect, it } from "vitest";

import { generateGoogleImage } from "../src/providers/google.js";
import { generateOpenAIImage } from "../src/providers/openai.js";
import { generateXAIImage } from "../src/providers/xai.js";
import type { GoogleParams, OpenAIParams, XAIParams } from "../src/schemas.js";

const tinyPng = Buffer.from("image").toString("base64");

describe("providers", () => {
  it("does not send response_format to GPT image models", async () => {
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
      model: "gpt-image-2",
      output_format: "png",
      return_mode: "file",
      inline_max_bytes: 1024,
    };
    const result = await generateOpenAIImage(params, client);

    expect(result.model).toBe("gpt-image-2");
    expect(calls[0]).toMatchObject({ model: "gpt-image-2", prompt: "cat", output_format: "png" });
    expect(calls[0]).not.toHaveProperty("response_format");
  });

  it("only sends response_format to DALL-E generation requests", async () => {
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

    const previousDefaultModel = process.env.DEFAULT_OPENAI_IMAGE_MODEL;
    process.env.DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
    try {
      const params: OpenAIParams = {
        prompt: "cat",
        model: "dall-e-3",
        output_format: "png",
        return_mode: "file",
        inline_max_bytes: 1024,
      };
      const result = await generateOpenAIImage(params, client);

      expect(result.model).toBe("dall-e-3");
      expect(calls[0]).toMatchObject({ model: "dall-e-3", prompt: "cat", response_format: "b64_json" });
      expect(calls[0]).not.toHaveProperty("output_format");
    } finally {
      if (previousDefaultModel === undefined) {
        delete process.env.DEFAULT_OPENAI_IMAGE_MODEL;
      } else {
        process.env.DEFAULT_OPENAI_IMAGE_MODEL = previousDefaultModel;
      }
    }
  });

  it("extracts Google inline image parts", async () => {
    const calls: unknown[] = [];
    const client = {
      models: {
        generateContent: async (body: unknown) => {
          calls.push(body);
          return {
            candidates: [{ content: { parts: [{ inlineData: { data: tinyPng, mimeType: "image/png" } }] } }],
            modelVersion: "test-version",
          };
        },
      },
    };
    const params: GoogleParams = {
      prompt: "cat",
      model: "gemini-test",
      image_size: "0.5K",
      return_mode: "file",
      inline_max_bytes: 1024,
    };

    const result = await generateGoogleImage(params, client);

    expect(result.provider).toBe("google");
    expect(result.images[0]?.mimeType).toBe("image/png");
    expect(calls[0]).toMatchObject({ config: { imageConfig: { imageSize: "0.5K" } } });
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
