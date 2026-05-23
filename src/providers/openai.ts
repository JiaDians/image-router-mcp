import { createReadStream } from "node:fs";

import OpenAI from "openai";

import { bytesFromBase64, base64FromUrl } from "../files.js";
import { requireEnv, UserInputError } from "../errors.js";
import type { OpenAIParams } from "../schemas.js";
import type { GeneratedImage, ProviderResult } from "../types.js";

export type OpenAIImageClient = {
  images: {
    generate: OpenAI["images"]["generate"];
    edit: OpenAI["images"]["edit"];
  };
};

let openAIClient: OpenAIImageClient | undefined;

function getOpenAIClient(): OpenAIImageClient {
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: requireEnv(["OPENAI_API_KEY"]) });
  }
  return openAIClient;
}

export function setOpenAIClientForTests(client: OpenAIImageClient | undefined): void {
  openAIClient = client;
}

async function imageFromOpenAIItem(item: { b64_json?: string | null; url?: string | null; revised_prompt?: string | null }, mimeType: string): Promise<GeneratedImage> {
  if (item.b64_json) {
    return {
      data: item.b64_json,
      mimeType,
      bytes: bytesFromBase64(item.b64_json),
      revisedPrompt: item.revised_prompt ?? undefined,
    };
  }
  if (item.url) {
    return { ...(await base64FromUrl(item.url)), url: item.url, revisedPrompt: item.revised_prompt ?? undefined };
  }
  throw new Error("OpenAI response did not include b64_json or url image data.");
}

export async function generateOpenAIImage(params: OpenAIParams, client: OpenAIImageClient = getOpenAIClient()): Promise<ProviderResult> {
  const model = process.env.DEFAULT_OPENAI_IMAGE_MODEL ?? params.model;
  const outputFormat = params.output_format;
  const inputImages = params.input_images ?? [];
  const common = {
    model,
    prompt: params.prompt,
    n: params.n,
    size: params.size,
    background: params.background,
    output_format: outputFormat,
    response_format: "b64_json" as const,
    user: params.user,
  };

  const response = inputImages.length > 0
    ? await (async () => {
        if (params.quality === "hd") {
          throw new UserInputError('OpenAI image edits do not support quality "hd". Use standard, auto, low, medium, or high.');
        }
        return client.images.edit({
          ...common,
          quality: params.quality,
          image:
            inputImages.length === 1
              ? createReadStream(inputImages[0]!)
              : inputImages.map((imagePath) => createReadStream(imagePath)),
        });
      })()
    : await client.images.generate({
        ...common,
        quality: params.quality,
        moderation: params.moderation,
        style: params.style,
      });

  const data = "data" in response ? response.data ?? [] : [];
  if (data.length === 0) {
    throw new Error("OpenAI response did not include generated images.");
  }
  const mimeType = `image/${outputFormat === "jpeg" ? "jpeg" : outputFormat}`;
  return {
    provider: "openai",
    model,
    images: await Promise.all(data.map((item) => imageFromOpenAIItem(item, mimeType))),
    metadata: {
      created: "created" in response ? response.created : undefined,
      usage: "usage" in response ? response.usage : undefined,
    },
  };
}
