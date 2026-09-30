# Phase 4 pre-flight — NIM base64 + function-calling verification

Test image: 320×240 JPEG generated locally (sky-blue top band, forest-green
middle band, saddle-brown bottom band, yellow circle top-right). Sent as
`image_url.url = "data:image/jpeg;base64,<...>"` (base64 omitted below).
Auth went in the `Authorization: Bearer` header (key redacted everywhere).
Defaults per the corrected brief: temperature 0.3, top_p 0.9,
max_tokens 800.

## Test 1a — nemotron base64 describe (NIM_API_KEY)

Request (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, plus
`reasoning_budget: 2048`):

```json
{
  "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Describe exactly what you see in this image: layout, colors, shapes. Be concrete, max 5 sentences."
        },
        {
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,<base64 omitted>" }
        }
      ]
    }
  ],
  "temperature": 0.3,
  "top_p": 0.9,
  "max_tokens": 800,
  "reasoning_budget": 2048
}
```

Response — HTTP 200, 17960 ms (server e2e_latency 17.43 s, 586 completion
tokens). Vendor-prefixed slug accepted; `reasoning_budget` accepted:

```json
{
  "id": "chatcmpl-b324bf8e-ae90-4ab1-bd12-5ac4cd586dee",
  "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "The image consists of three horizontal bands of color stacked from top to bottom. The top band is light blue, containing a yellow circle in the upper right corner that resembles a sun. The middle band is a solid green rectangle. The bottom band is a solid brown rectangle. The scene depicts a simplified, flat landscape.",
        "role": "assistant",
        "reasoning_content": "The user wants a concrete description of the image.\n1. **Analyze the layout:** ... Top band: Sky. Middle band: Grass/Field. Bottom band: Ground/Soil.\n2. **Analyze colors:** Top: Light blue. Middle: Green. Bottom: Brown. Shape: yellow circle (sun) top right ...\n(final polish picks the 4-sentence answer above)"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 313, "completion_tokens": 586, "total_tokens": 899 }
}
```

Verdict: PASS. Genuine reading (blue/green/brown bands + yellow circle
placed correctly), not generic. Latency fits the 25 s budget.

## Test 1b — llama base64 describe (NIM_LLAMA_API_KEY)

Same body with `model: meta/llama-3.2-11b-vision-instruct`, no
`reasoning_budget`. Response — HTTP 200, 5740 ms:

```json
{
  "id": "chatcmpl-7e8caccd011f42e3bf747f6bf7a8ca61",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The image depicts a simple, two-dimensional landscape with a light blue sky at the top, a green field in the middle, and a brown field at the bottom. A yellow circle, likely representing the sun, is positioned in the top-right corner of the image. The overall composition is straightforward, with no additional details or features present. The color palette is limited to blue, green, brown, and yellow, creating a visually striking yet minimalist representation."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 1635, "total_tokens": 1726, "completion_tokens": 91 }
}
```

Verdict: PASS. Correct content, much faster (5.7 s).

## Test 2 — nemotron function-calling + vision (NIM_API_KEY)

Same image plus one forced tool (`record_bottom_color`, single required
string field `color`), `reasoning_budget: 2048`. Response — HTTP 200,
3681 ms:

```json
{
  "id": "chatcmpl-68169361-81d4-4cb3-82fe-deffcfa577c6",
  "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": null,
        "tool_calls": [
          {
            "id": "call-893a10ba-12b5-4f4e-ba93-ced2d540795c",
            "type": "function",
            "function": {
              "name": "record_bottom_color",
              "arguments": "{\"color\": \"brown\"}"
            }
          }
        ],
        "role": "assistant",
        "reasoning_content": "Okay, let's see... The bottom third is the brown part... So I need to identify the color of the bottom third. The bottom third is brown. Therefore, I should call the tool with color: \"brown\"."
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": { "prompt_tokens": 573, "completion_tokens": 116, "total_tokens": 689 }
}
```

Verdict: PASS. `finish_reason: tool_calls`, argument (`brown`) derived
from the actual image — not a text fallback.

## Side finding — Gemini model ID (GEMINI_API_KEY)

`gemini-2.5-flash:generateContent` returns 404 for this key ("no longer
available to new users"). The live models list plus Google's own error
message point at `gemini-3.8-flash`, which verified live: HTTP 200 in
5030 ms, reply "The image contains light blue, green, brown, and
yellow." — all four test colors correct. `gemini-provider.ts` default
updated accordingly (separate fix commit).

## Decision

Both pre-flight checks succeed → proceed with ADR-0008 exactly as
written: nemotron + function-calling primary, llama-11b prompt-JSON
documented fallback. No reversal ADR needed. `reasoning_budget: 2048`
stays (worst observed latency 18 s < 25 s timeout).
