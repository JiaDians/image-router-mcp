import { z } from "zod";

export const DEFAULT_INLINE_MAX_BYTES = 4 * 1024 * 1024;

export const returnModeSchema = z
  .enum(["file", "inline", "both"])
  .default("file")
  .describe("How generated images are returned. Use file for large images; inline embeds base64 image content in the MCP response.");

const nonEmptyString = z.string().trim().min(1);
const defaultOpenAIImageModel = process.env.DEFAULT_OPENAI_IMAGE_MODEL ?? "gpt-image-2";

const commonImageShape = {
  prompt: nonEmptyString.describe("Image generation or editing instructions."),
  model: nonEmptyString.optional().describe("Provider model ID. Any string is allowed so newly released models are not blocked."),
  output_path: nonEmptyString.optional().describe("File path or directory for saved output. Defaults to DEFAULT_OUTPUT_DIR or ./generated-images."),
  input_images: z.array(nonEmptyString).optional().describe("Local image paths used as edit/reference inputs."),
  return_mode: returnModeSchema,
  inline_max_bytes: z
    .number()
    .int()
    .positive()
    .default(DEFAULT_INLINE_MAX_BYTES)
    .describe("Maximum bytes allowed for each inline image response."),
  n: z.number().int().min(1).max(10).optional().describe("Number of images to generate when the provider supports it."),
  user: nonEmptyString.optional().describe("Optional end-user identifier for provider abuse monitoring."),
} as const;

export const openAIInputShape = {
  ...commonImageShape,
  model: nonEmptyString.default(defaultOpenAIImageModel).describe("OpenAI image model ID. Defaults to DEFAULT_OPENAI_IMAGE_MODEL or gpt-image-2."),
  size: nonEmptyString.optional().describe("OpenAI size, such as auto, 1024x1024, 1536x1024, or any supported WIDTHxHEIGHT."),
  quality: z.enum(["auto", "low", "medium", "high", "standard", "hd"]).optional().describe("OpenAI quality."),
  background: z.enum(["transparent", "opaque", "auto"]).optional().describe("OpenAI background option."),
  output_format: z.enum(["png", "jpeg", "webp"]).default("png").describe("Output image format."),
  moderation: z.enum(["low", "auto"]).optional().describe("OpenAI moderation setting for supported models."),
  style: z.enum(["vivid", "natural"]).optional().describe("DALL-E 3 style option."),
} as const;

export const googleInputShape = {
  ...commonImageShape,
  model: nonEmptyString.default("gemini-3.1-flash-image-preview").describe("Google image model ID. Defaults to Nano Banana 2."),
  aspect_ratio: nonEmptyString.optional().describe("Aspect ratio, for example 1:1, 16:9, 9:16, 4:3, or 3:2."),
  image_size: z.enum(["512", "1K", "2K", "4K"]).optional().describe("Google image size where supported."),
} as const;

export const xaiInputShape = {
  ...commonImageShape,
  input_images: z.array(nonEmptyString).max(3).optional().describe("Local image paths used as edit/reference inputs. xAI supports up to 3 input images."),
  model: nonEmptyString.default("grok-imagine-image-quality").describe("xAI/Grok image model ID."),
  aspect_ratio: nonEmptyString.optional().describe("Aspect ratio, for example 1:1, 16:9, 9:16, 3:2, or auto."),
  resolution: z.enum(["1k", "2k"]).optional().describe("xAI image resolution."),
} as const;

export const openAIParamsSchema = z.object(openAIInputShape).strict();
export const googleParamsSchema = z.object(googleInputShape).strict();
export const xaiParamsSchema = z.object(xaiInputShape).strict();

export type ReturnMode = z.infer<typeof returnModeSchema>;
export type OpenAIParams = z.infer<typeof openAIParamsSchema>;
export type GoogleParams = z.infer<typeof googleParamsSchema>;
export type XAIParams = z.infer<typeof xaiParamsSchema>;
