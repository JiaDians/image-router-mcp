#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { formatError } from "./errors.js";
import { buildToolContent, persistImages } from "./files.js";
import { generateGoogleImage } from "./providers/google.js";
import { generateOpenAIImage } from "./providers/openai.js";
import { generateXAIImage } from "./providers/xai.js";
import {
  googleInputShape,
  googleParamsSchema,
  openAIInputShape,
  openAIParamsSchema,
  xaiInputShape,
  xaiParamsSchema,
  type GoogleParams,
  type OpenAIParams,
  type ReturnMode,
  type XAIParams,
} from "./schemas.js";
import type { ProviderResult } from "./types.js";

async function finalizeResult(result: ProviderResult, outputPath: string | undefined, returnMode: ReturnMode, inlineMaxBytes: number): Promise<CallToolResult> {
  const shouldPersist = returnMode === "file" || returnMode === "both";
  const finalResult = shouldPersist ? await persistImages(result, outputPath) : result;
  return {
    content: buildToolContent(finalResult, returnMode, inlineMaxBytes),
    structuredContent: {
      provider: finalResult.provider,
      model: finalResult.model,
      images: finalResult.images.map(({ data: _data, ...image }) => image),
      metadata: finalResult.metadata,
    },
  };
}

function errorResult(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: formatError(error) }],
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "image-router-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "openai_generate_image",
    {
      title: "OpenAI image generation and editing",
      description:
        "Generate or edit images with OpenAI image models. Model is a flexible string so newly released image models are not blocked.",
      inputSchema: openAIInputShape,
    },
    async (rawParams) => {
      try {
        const params: OpenAIParams = openAIParamsSchema.parse(rawParams);
        const result = await generateOpenAIImage(params);
        return await finalizeResult(result, params.output_path, params.return_mode, params.inline_max_bytes);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "google_generate_image",
    {
      title: "Google Gemini/Nano Banana image generation and editing",
      description:
        "Generate or edit images with Google Gemini image models, including Nano Banana, Nano Banana 2, and Nano Banana Pro model IDs.",
      inputSchema: googleInputShape,
    },
    async (rawParams) => {
      try {
        const params: GoogleParams = googleParamsSchema.parse(rawParams);
        const result = await generateGoogleImage(params);
        return await finalizeResult(result, params.output_path, params.return_mode, params.inline_max_bytes);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "xai_generate_image",
    {
      title: "xAI/Grok image generation and editing",
      description:
        "Generate or edit images with xAI Grok Imagine models. Local input_images are sent as data URIs for the xAI JSON image edit endpoint.",
      inputSchema: xaiInputShape,
    },
    async (rawParams) => {
      try {
        const params: XAIParams = xaiParamsSchema.parse(rawParams);
        const result = await generateXAIImage(params);
        return await finalizeResult(result, params.output_path, params.return_mode, params.inline_max_bytes);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(formatError(error));
    process.exitCode = 1;
  });
}
