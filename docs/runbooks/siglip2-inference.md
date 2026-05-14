# SigLIP-2 inference — wiring /lookbook + keyframe encoding

## Why

`/lookbook` is a visual reverse-search scaffold. The schema's there
(`production_keyframes.embedding` is `vector(1152)` with HNSW), the UI
component renders, but there's no encoder hosted anywhere — so query
embeddings can't be computed at request time and the page is a stub.

## What needs to exist

A POST endpoint that takes an image (URL or base64) and returns a
1152-dim float32 vector matching what the keyframe ingest pipeline
produces. The two pipelines MUST use the same SigLIP-2 checkpoint or
results are garbage.

Canonical model: `google/siglip2-so400m-patch14-384` (so400m = 400M
params, 384px patches). 1152-dim output.

## Hosting options

| Option | Cold start | $/1K queries | Notes |
|---|---|---|---|
| Replicate | ~5–10s | ~$0.20 | Easiest: existing siglip models published. Pay per second of GPU. |
| Modal | ~2–5s (warm container) | ~$0.05 | Cheapest pay-per-use; container snapshots help cold-start. |
| Self-host on Fly GPU | $0 marginal | + $2/hr GPU rental | Only worth it at >50K queries/day. |
| HuggingFace Inference Endpoints | ~10–30s | ~$0.50 | Reliable but pricier. |

**Recommendation: Modal.** Best $/query at CineCanon's volume, and the
Python SDK is one file.

## Modal setup sketch

`packages/scraper/src/embeddings/modal_siglip.py`:

```python
import modal

app = modal.App("siglip2-embeddings")
image = (
    modal.Image.debian_slim()
    .pip_install("torch==2.4.0", "transformers==4.45.0", "Pillow", "requests")
    .pip_install("accelerate")
)

@app.cls(image=image, gpu="A10G", scaledown_window=120)
class SiglipEncoder:
    @modal.enter()
    def load(self):
        from transformers import AutoProcessor, AutoModel
        import torch
        self.processor = AutoProcessor.from_pretrained(
            "google/siglip2-so400m-patch14-384"
        )
        self.model = AutoModel.from_pretrained(
            "google/siglip2-so400m-patch14-384",
            torch_dtype=torch.float16,
        ).to("cuda").eval()

    @modal.fastapi_endpoint(method="POST")
    def encode(self, payload: dict):
        import torch, requests, base64, io
        from PIL import Image
        if "url" in payload:
            img = Image.open(io.BytesIO(requests.get(payload["url"]).content))
        else:
            img = Image.open(io.BytesIO(base64.b64decode(payload["b64"])))
        img = img.convert("RGB")
        inputs = self.processor(images=img, return_tensors="pt").to("cuda")
        with torch.no_grad():
            feats = self.model.get_image_features(**inputs)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        return {"embedding": feats[0].cpu().float().tolist()}
```

Deploy:
```bash
pip install modal
modal token new   # interactive auth
modal deploy packages/scraper/src/embeddings/modal_siglip.py
```

Modal prints a URL like `https://your-org--siglip2-embeddings-siglipencoder-encode.modal.run`.
Save it as `SIGLIP_ENCODER_URL` in your env.

## Wire /lookbook

The UI already POSTs a file to `/api/lookbook/search`. That route needs to
exist:

```ts
// apps/web/app/api/lookbook/search/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@bts/db';
import { sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { namespace: 'lookbook', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const form = await req.formData();
  const file = form.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'no image' }, { status: 400 });

  const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  const encRes = await fetch(process.env.SIGLIP_ENCODER_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ b64 }),
  });
  if (!encRes.ok) return NextResponse.json({ error: 'encoder failed' }, { status: 502 });
  const { embedding } = await encRes.json();

  // pgvector cosine-distance nearest neighbour (HNSW index on production_keyframes.embedding)
  const literal = `[${embedding.join(',')}]`;
  const rows = await db.execute(sql`
    SELECT k.id, k.production_id, k.scene_id, k.image_url,
           p.slug AS production_slug, p.title AS production_title,
           (k.embedding <=> ${literal}::vector) AS distance
    FROM production_keyframes k
    JOIN productions p ON p.id = k.production_id
    WHERE k.embedding IS NOT NULL
    ORDER BY k.embedding <=> ${literal}::vector
    LIMIT 24
  `);
  return NextResponse.json({ matches: rows });
}
```

## Backfill: encoding existing keyframes

The admin ingest job **"Key-frame visual embedding"** (`embed:visual`)
already wraps `packages/scraper/src/embeddings/visual.ts`. It detects
the configured backend at runtime:

1. If `SIGLIP_ENCODER_URL` is set → uses the Modal endpoint (this
   runbook). Same endpoint `/api/lookbook/search` uses; one env
   covers both.
2. Else if `REPLICATE_API_TOKEN` is set → falls back to Replicate
   (`lucataco/siglip-2`). Legacy path, kept for environments where
   Modal isn't set up.
3. Else → throws `MissingSiglipBackendError` with a pointer to this
   runbook before processing any rows (fail-fast).

So once you've deployed Modal and set `SIGLIP_ENCODER_URL`, the
admin "Key-frame visual embedding" job works with no further changes.

Migration 0053 added `embedding_model` + `embedding_generated_at`
columns. When the canonical model changes, the sweep finds stale rows
by `WHERE embedding_model != 'siglip2-so400m-384'`. (The current
visual.ts writes only the `embedding` column; updating those provenance
columns alongside is a future enhancement — track separately.)

## Cost estimate

Modal A10G: $0.000306/s. Encoding one image ~250ms warm, ~3s cold.

| Scenario | Volume | Cost |
|---|---|---|
| Backfill 50K keyframes one-shot | ~3.5hr warm | ~$3.85 |
| Steady-state /lookbook traffic at 100/day | ~25s/day | ~$0.23/mo |

## Rollback

`/lookbook` already handles the "no results" state. If the encoder breaks,
the route can be temporarily wrapped in a feature flag — but for now,
absence of `SIGLIP_ENCODER_URL` should make the route return 503 with a
"feature unavailable" message rather than crash.
