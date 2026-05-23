import { base64FromUrl, bytesFromBase64, loadInputImages, toDataUri } from "../files.js";
import { requireEnv } from "../errors.js";
import type { XAIParams } from "../schemas.js";
import type { GeneratedImage, ProviderResult } from "../types.js";

type XAIImageData = {
  b64_json?: string | null;
  mime_type?: string | null;
  url?: string | null;
};

type XAIImageResponse = {
  data?: XAIImageData[];
  usage?: Record<string, unknown>;
};

export type FetchLike = typeof fetch;

const XAI_BASE_URL = "https://api.x.ai/v1";

async function imageFromXAIItem(item: XAIImageData): Promise<GeneratedImage> {
  if (item.b64_json) {
    return {
      data: item.b64_json,
      mimeType: item.mime_type ?? "image/png",
      bytes: bytesFromBase64(item.b64_json),
      url: item.url ?? undefined,
    };
  }
  if (item.url) {
    return { ...(await base64FromUrl(item.url)), url: item.url };
  }
  throw new Error("xAI response did not include b64_json or url image data.");
}

export async function generateXAIImage(params: XAIParams, fetchImpl: FetchLike = fetch): Promise<ProviderResult> {
  const model = process.env.DEFAULT_XAI_IMAGE_MODEL ?? params.model;
  const inputImages = await loadInputImages(params.input_images);
  const isEdit = inputImages.length > 0;
  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    n: params.n,
    aspect_ratio: params.aspect_ratio,
    resolution: params.resolution,
    response_format: "b64_json",
    user: params.user,
  };

  if (isEdit) {
    if (inputImages.length === 1) {
      body.image = { url: toDataUri(inputImages[0]!), type: "image_url" };
    } else {
      body.images = inputImages.map((image) => ({ url: toDataUri(image), type: "image_url" }));
    }
  }

  const response = await fetchImpl(`${XAI_BASE_URL}/images/${isEdit ? "edits" : "generations"}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv(["XAI_API_KEY"])}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseBody = (await response.json().catch(() => ({}))) as XAIImageResponse | { error?: unknown };
  if (!response.ok) {
    throw new Error(`xAI image request failed (${response.status}): ${JSON.stringify(responseBody)}`);
  }

  const data = "data" in responseBody ? responseBody.data ?? [] : [];
  if (data.length === 0) {
    throw new Error("xAI response did not include generated images.");
  }

  return {
    provider: "xai",
    model,
    images: await Promise.all(data.map(imageFromXAIItem)),
    metadata: {
      usage: "usage" in responseBody ? responseBody.usage : undefined,
    },
  };
}
