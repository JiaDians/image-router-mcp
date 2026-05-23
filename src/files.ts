import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

import { UserInputError } from "./errors.js";
import type { GeneratedImage, LoadedImage, ProviderResult } from "./types.js";
import type { ReturnMode } from "./schemas.js";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export function mimeFromPath(filePath: string): string {
  const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
  if (!mime) {
    throw new UserInputError(`Unsupported image extension for ${filePath}. Use png, jpg, jpeg, or webp.`);
  }
  return mime;
}

export function extensionFromMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? ".png";
}

export async function loadInputImages(paths: string[] = []): Promise<LoadedImage[]> {
  return Promise.all(
    paths.map(async (imagePath) => {
      const absolutePath = path.resolve(imagePath);
      const buffer = await readFile(absolutePath);
      return {
        path: absolutePath,
        data: buffer.toString("base64"),
        mimeType: mimeFromPath(absolutePath),
        bytes: buffer.byteLength,
      };
    }),
  );
}

export function toDataUri(image: LoadedImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

export function bytesFromBase64(data: string): number {
  return Buffer.byteLength(data, "base64");
}

export async function base64FromUrl(url: string): Promise<{ data: string; mimeType: string; bytes: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated image URL (${response.status} ${response.statusText})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(arrayBuffer);
  return { data: buffer.toString("base64"), mimeType, bytes: buffer.byteLength };
}

export function defaultOutputDir(): string {
  return path.resolve(process.env.DEFAULT_OUTPUT_DIR ?? path.join(process.cwd(), "generated-images"));
}

function safeModelSlug(model: string): string {
  return model.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48) || "model";
}

function generatedFileName(provider: ProviderResult["provider"], model: string, mimeType: string, index: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = randomBytes(3).toString("hex");
  const modelHash = createHash("sha1").update(model).digest("hex").slice(0, 8);
  return `${provider}-${safeModelSlug(model)}-${modelHash}-${timestamp}-${index}-${suffix}${extensionFromMime(mimeType)}`;
}

async function resolveOutputPath(outputPath: string | undefined, result: ProviderResult, image: GeneratedImage, index: number): Promise<string> {
  const target = path.resolve(outputPath ?? defaultOutputDir());
  if (outputPath) {
    try {
      const info = await stat(target);
      if (info.isDirectory()) {
        return path.join(target, generatedFileName(result.provider, result.model, image.mimeType, index));
      }
    } catch {
      if (!path.extname(target)) {
        await mkdir(target, { recursive: true });
        return path.join(target, generatedFileName(result.provider, result.model, image.mimeType, index));
      }
    }
    await mkdir(path.dirname(target), { recursive: true });
    if (result.images.length === 1) {
      return target;
    }
    const parsed = path.parse(target);
    return path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext || extensionFromMime(image.mimeType)}`);
  }
  await mkdir(target, { recursive: true });
  return path.join(target, generatedFileName(result.provider, result.model, image.mimeType, index));
}

export async function persistImages(result: ProviderResult, outputPath?: string): Promise<ProviderResult> {
  const images = await Promise.all(
    result.images.map(async (image, index) => {
      const filePath = await resolveOutputPath(outputPath, result, image, index);
      await writeFile(filePath, Buffer.from(image.data, "base64"));
      return { ...image, path: filePath };
    }),
  );
  return { ...result, images };
}

export type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export function buildToolContent(result: ProviderResult, returnMode: ReturnMode, inlineMaxBytes: number): ToolContent[] {
  const summary = {
    provider: result.provider,
    model: result.model,
    images: result.images.map((image) => ({
      path: image.path,
      url: image.url,
      mimeType: image.mimeType,
      bytes: image.bytes,
      revisedPrompt: image.revisedPrompt,
    })),
    text: result.text,
    metadata: result.metadata,
  };
  const content: ToolContent[] = [{ type: "text", text: JSON.stringify(summary, null, 2) }];
  if (returnMode === "inline" || returnMode === "both") {
    for (const image of result.images) {
      if (image.bytes > inlineMaxBytes) {
        throw new UserInputError(
          `Image is ${image.bytes} bytes, above inline_max_bytes ${inlineMaxBytes}. Use return_mode "file" or raise inline_max_bytes.`,
        );
      }
      content.push({ type: "image", data: image.data, mimeType: image.mimeType });
    }
  }
  return content;
}
