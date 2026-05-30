# image-router-mcp

[![npm version](https://img.shields.io/npm/v/image-router-mcp.svg)](https://www.npmjs.com/package/image-router-mcp)
[![npm downloads](https://img.shields.io/npm/dm/image-router-mcp.svg)](https://www.npmjs.com/package/image-router-mcp)

English | [繁體中文](#繁體中文)

Open-source MCP server for routing image generation and editing across xAI/Grok, Google Gemini/Nano Banana, and OpenAI.

It keeps model IDs flexible instead of locking tools to a small allowlist, so newly released image models can work as soon as the provider API supports the same image endpoint and parameters.

## Features

- Route image generation and editing through three MCP tools: xAI, Google, and OpenAI.
- Use local images as references or edit inputs via `input_images`.
- Save generated images to disk by default to avoid large base64 payloads over stdio.
- Optionally return inline MCP image content for clients that can render images directly.
- Override provider defaults with environment variables or per-call `model` arguments.

## Tools

| Tool | Provider | Supports |
| --- | --- | --- |
| `xai_generate_image` | xAI/Grok | Text-to-image and JSON image edits with up to 3 local `input_images` |
| `google_generate_image` | Google Gemini/Nano Banana | Text-to-image and local reference/edit images, including `512`, `1K`, `2K`, and `4K` image sizes where supported |
| `openai_generate_image` | OpenAI | Text-to-image and local reference/edit images |

## Model examples

These are examples, not allowlists.

| Provider | Example models |
| --- | --- |
| xAI | `grok-imagine-image-quality`, `grok-imagine-image` |
| Google | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-image` |
| OpenAI | `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, `chatgpt-image-latest`, `dall-e-3` |

## Quick start

```bash
npm install
npm run build
```

For MCP clients, run the published package with `npx`:

```json
{
  "mcpServers": {
    "image-router-mcp": {
      "command": "npx",
      "args": ["-y", "image-router-mcp"],
      "env": {
        "XAI_API_KEY": "your_xai_key",
        "GOOGLE_API_KEY": "your_google_key",
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

> [!TIP]
> Set only the API keys for the providers you use. Keys are checked lazily when each tool is called.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `XAI_API_KEY` | For xAI tool | xAI API key. |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | For Google tool | Google Gemini API key. |
| `OPENAI_API_KEY` | For OpenAI tool | OpenAI API key. |
| `DEFAULT_XAI_IMAGE_MODEL` | No | Overrides the default xAI image model. |
| `DEFAULT_GOOGLE_IMAGE_MODEL` | No | Overrides the default Google image model. |
| `DEFAULT_OPENAI_IMAGE_MODEL` | No | Sets the default OpenAI image model when `model` is omitted. |
| `DEFAULT_OUTPUT_DIR` | No | Directory for saved images. Defaults to `./generated-images`. |

## How to use this MCP

After adding the server to your MCP client, ask the client to use one of the image tools. For example:

```json
{
  "tool": "openai_generate_image",
  "arguments": {
    "prompt": "A cinematic product photo of a transparent mechanical keyboard on a marble desk",
    "model": "gpt-image-2",
    "size": "1024x1024",
    "return_mode": "file",
    "output_path": "./generated-images"
  }
}
```

To edit or reference existing local images, pass file paths with `input_images`:

```json
{
  "tool": "google_generate_image",
  "arguments": {
    "prompt": "Turn this sketch into a polished mobile app hero illustration",
    "model": "gemini-3.1-flash-image-preview",
    "input_images": ["./assets/sketch.png"],
    "aspect_ratio": "16:9",
    "image_size": "512",
    "return_mode": "both"
  }
}
```

### Return modes

| Mode | Behavior |
| --- | --- |
| `file` | Default. Saves images to disk and returns file paths. |
| `inline` | Returns MCP `image` content blocks, capped by `inline_max_bytes`. |
| `both` | Saves images to disk and also returns inline image content. |

Use `file` for large generations. Use `inline` or `both` only when your MCP client can display image content and the images fit within your payload limits.

## Development

```bash
npm install
npm run dev
npm run ci
```

`npm run ci` runs type checking, tests, and a production build.

## 繁體中文

開源 MCP 伺服器，可將圖片生成與編輯請求路由到 xAI/Grok、Google Gemini/Nano Banana 與 OpenAI。

此專案刻意接受彈性的模型 ID，而不是把工具鎖在固定清單內；只要供應商 API 支援相同圖片端點與參數，新模型通常可以直接使用。

## 功能

- 透過三個 MCP 工具路由圖片生成與編輯：xAI、Google、OpenAI。
- 使用本機圖片作為參考圖或編輯輸入，透過 `input_images` 傳入。
- 預設將生成圖片儲存到磁碟，避免透過 stdio 傳送大型 base64 payload。
- 可選擇回傳 inline MCP 圖片內容，讓支援的客戶端直接顯示圖片。
- 可用環境變數或每次呼叫的 `model` 參數覆寫預設模型。

## 工具

| 工具 | 供應商 | 支援內容 |
| --- | --- | --- |
| `xai_generate_image` | xAI/Grok | 文字生成圖片，以及最多 3 張本機 `input_images` 的 JSON 圖片編輯 |
| `google_generate_image` | Google Gemini/Nano Banana | 文字生成圖片，以及本機參考圖/編輯圖；支援供應商允許的 `512`、`1K`、`2K`、`4K` 圖片尺寸 |
| `openai_generate_image` | OpenAI | 文字生成圖片，以及本機參考圖/編輯圖 |

## 模型範例

以下是範例，不是允許清單。

| 供應商 | 模型範例 |
| --- | --- |
| xAI | `grok-imagine-image-quality`, `grok-imagine-image` |
| Google | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-image` |
| OpenAI | `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, `chatgpt-image-latest`, `dall-e-3` |

## 快速開始

```bash
npm install
npm run build
```

在 MCP 客戶端中，可用 `npx` 執行已發布的套件：

```json
{
  "mcpServers": {
    "image-router-mcp": {
      "command": "npx",
      "args": ["-y", "image-router-mcp"],
      "env": {
        "XAI_API_KEY": "your_xai_key",
        "GOOGLE_API_KEY": "your_google_key",
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

> [!TIP]
> 只需要設定會用到的供應商 API Key。Key 會在呼叫對應工具時才檢查。

## 設定

| 變數 | 必要性 | 說明 |
| --- | --- | --- |
| `XAI_API_KEY` | 使用 xAI 工具時需要 | xAI API Key。 |
| `GOOGLE_API_KEY` 或 `GEMINI_API_KEY` | 使用 Google 工具時需要 | Google Gemini API Key。 |
| `OPENAI_API_KEY` | 使用 OpenAI 工具時需要 | OpenAI API Key。 |
| `DEFAULT_XAI_IMAGE_MODEL` | 否 | 覆寫預設 xAI 圖片模型。 |
| `DEFAULT_GOOGLE_IMAGE_MODEL` | 否 | 覆寫預設 Google 圖片模型。 |
| `DEFAULT_OPENAI_IMAGE_MODEL` | 否 | 未傳入 `model` 時使用的預設 OpenAI 圖片模型。 |
| `DEFAULT_OUTPUT_DIR` | 否 | 圖片輸出資料夾，預設為 `./generated-images`。 |

## 這個 MCP 怎麼用

將 server 加到 MCP 客戶端後，請客戶端呼叫其中一個圖片工具。例如：

```json
{
  "tool": "openai_generate_image",
  "arguments": {
    "prompt": "A cinematic product photo of a transparent mechanical keyboard on a marble desk",
    "model": "gpt-image-2",
    "size": "1024x1024",
    "return_mode": "file",
    "output_path": "./generated-images"
  }
}
```

若要使用既有本機圖片作為編輯或參考輸入，傳入 `input_images`：

```json
{
  "tool": "google_generate_image",
  "arguments": {
    "prompt": "Turn this sketch into a polished mobile app hero illustration",
    "model": "gemini-3.1-flash-image-preview",
    "input_images": ["./assets/sketch.png"],
    "aspect_ratio": "16:9",
    "image_size": "512",
    "return_mode": "both"
  }
}
```

### 回傳模式

| 模式 | 行為 |
| --- | --- |
| `file` | 預設。將圖片存到磁碟並回傳檔案路徑。 |
| `inline` | 回傳 MCP `image` content block，大小受 `inline_max_bytes` 限制。 |
| `both` | 同時儲存圖片到磁碟並回傳 inline 圖片內容。 |

大型生成結果建議使用 `file`。只有在 MCP 客戶端支援圖片顯示、且圖片大小符合 payload 限制時，才使用 `inline` 或 `both`。

## 開發

```bash
npm install
npm run dev
npm run ci
```

`npm run ci` 會執行型別檢查、測試與正式建置。
