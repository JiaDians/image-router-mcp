import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildToolContent, loadInputImages, persistImages } from "../src/files.js";
import type { ProviderResult } from "../src/types.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("file helpers", () => {
  it("loads local images as base64 with mime metadata", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "image-router-mcp-"));
    const imagePath = path.join(tempDir, "input.png");
    await writeFile(imagePath, Buffer.from("png-data"));

    const [image] = await loadInputImages([imagePath]);

    expect(image?.mimeType).toBe("image/png");
    expect(image?.data).toBe(Buffer.from("png-data").toString("base64"));
  });

  it("persists generated images and returns file summaries by default", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "image-router-mcp-"));
    const result: ProviderResult = {
      provider: "google",
      model: "gemini-test",
      images: [{ data: Buffer.from("image").toString("base64"), mimeType: "image/png", bytes: 5 }],
    };

    const persisted = await persistImages(result, tempDir);
    const content = buildToolContent(persisted, "file", 1024);

    expect(persisted.images[0]?.path).toMatch(tempDir);
    expect(content).toHaveLength(1);
    expect(content[0]?.type).toBe("text");
  });

  it("blocks oversized inline images", () => {
    const result: ProviderResult = {
      provider: "openai",
      model: "gpt-image-test",
      images: [{ data: Buffer.from("large").toString("base64"), mimeType: "image/png", bytes: 5 }],
    };

    expect(() => buildToolContent(result, "inline", 4)).toThrow(/above inline_max_bytes/);
  });
});
