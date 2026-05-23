import { GoogleGenAI, Modality, type Part } from "@google/genai";

import { bytesFromBase64, loadInputImages } from "../files.js";
import { requireEnv } from "../errors.js";
import type { GoogleParams } from "../schemas.js";
import type { GeneratedImage, ProviderResult } from "../types.js";

export type GoogleImageClient = {
  models: {
    generateContent: GoogleGenAI["models"]["generateContent"];
  };
};

let googleClient: GoogleImageClient | undefined;

function getGoogleClient(): GoogleImageClient {
  if (!googleClient) {
    googleClient = new GoogleGenAI({ apiKey: requireEnv(["GOOGLE_API_KEY", "GEMINI_API_KEY"]) });
  }
  return googleClient;
}

export function setGoogleClientForTests(client: GoogleImageClient | undefined): void {
  googleClient = client;
}

export async function generateGoogleImage(params: GoogleParams, client: GoogleImageClient = getGoogleClient()): Promise<ProviderResult> {
  const model = process.env.DEFAULT_GOOGLE_IMAGE_MODEL ?? params.model;
  const inputImages = await loadInputImages(params.input_images);
  const parts: Part[] = [
    { text: params.prompt },
    ...inputImages.map((image) => ({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    })),
  ];

  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      ...(params.aspect_ratio || params.image_size
        ? {
            imageConfig: {
              ...(params.aspect_ratio ? { aspectRatio: params.aspect_ratio } : {}),
              ...(params.image_size ? { imageSize: params.image_size } : {}),
            },
          }
        : {}),
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const images: GeneratedImage[] = responseParts
    .filter((part) => part.inlineData?.data)
    .map((part) => {
      const data = part.inlineData!.data!;
      const mimeType = part.inlineData!.mimeType ?? "image/png";
      return { data, mimeType, bytes: bytesFromBase64(data) };
    });
  const text = responseParts
    .map((part) => part.text)
    .filter((value): value is string => Boolean(value))
    .join("\n");

  if (images.length === 0) {
    throw new Error(text || response.promptFeedback?.blockReasonMessage || "Google response did not include generated image data.");
  }

  return {
    provider: "google",
    model,
    images,
    text: text || undefined,
    metadata: {
      modelVersion: response.modelVersion,
      responseId: response.responseId,
      usageMetadata: response.usageMetadata,
    },
  };
}
