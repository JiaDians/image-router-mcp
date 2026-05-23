export type LoadedImage = {
  path: string;
  data: string;
  mimeType: string;
  bytes: number;
};

export type GeneratedImage = {
  data: string;
  mimeType: string;
  path?: string;
  url?: string;
  bytes: number;
  revisedPrompt?: string;
};

export type ProviderResult = {
  provider: "openai" | "google" | "xai";
  model: string;
  images: GeneratedImage[];
  text?: string;
  metadata?: Record<string, unknown>;
};
