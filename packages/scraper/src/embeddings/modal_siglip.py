# SigLIP-2 image-encoder Modal deployment.
#
# Returns 768-dim normalised image embeddings matching what the
# production_keyframes.embedding column (migration 0030) expects.
# The two pipelines MUST use the same checkpoint or nearest-neighbour
# search returns garbage — pin the model name below and update with care.
#
# Model choice: siglip2-base-patch16-384 (768-dim). The so400m variant
# (1152-dim) would be more accurate but requires a vector column migration
# and full re-embed. Base is the established baseline; upgrade is a future
# task tracked via migration 0053's embedding_model column.
#
# Deploy:
#   pip install modal
#   modal token new            # interactive auth, one-time
#   modal deploy packages/scraper/src/embeddings/modal_siglip.py
#
# Modal will print a URL like
#   https://<org>--siglip2-embeddings-siglipencoder-encode.modal.run
# Save that as SIGLIP_ENCODER_URL in your Vercel/Fly env. apps/web/app/api/
# lookbook/search/route.ts reads it at request time; absence → clean 503.
#
# Cost (May 2026 pricing):
#   - A10G GPU: $0.000306/s
#   - Per-image encode warm: ~250ms → ~$0.000077
#   - 50K-keyframe backfill (warm, batched): ~3.5hr → ~$3.85 one-shot
#   - Steady-state /lookbook traffic at 100/day: ~25s/day → ~$0.23/mo
#
# scaledown_window=120 keeps the container warm for 2min after the last
# request — cheap insurance against cold-start tax on bursty traffic.

import modal

app = modal.App("siglip2-embeddings")

image = (
    modal.Image.debian_slim()
    .pip_install(
        # torch 2.4.0 was de-listed from PyPI in late 2026; pinning to
        # 2.5.1 (the oldest still-published wheel) for reproducibility.
        "torch==2.5.1",
        "transformers==4.46.3",
        "Pillow==10.4.0",
        "requests==2.32.3",
        "accelerate==1.0.1",
        # Modal 1.x requires FastAPI explicitly for @fastapi_endpoint
        # decorators (the implicit dep was removed in late 2026).
        "fastapi[standard]==0.115.5",
    )
)

MODEL_ID = "google/siglip2-base-patch16-384"  # 768-dim output


@app.cls(image=image, gpu="A10G", scaledown_window=120, timeout=120)
class SiglipEncoder:
    @modal.enter()
    def load(self):
        """Load the SigLIP-2 checkpoint once per container, keep on GPU.

        We use AutoImageProcessor (not AutoProcessor) so we only pull
        the vision side of the model. AutoProcessor tries to instantiate
        the text tokenizer too, which needs `sentencepiece` — extra
        dependency for a code path we never exercise here (image-only
        embeddings).
        """
        from transformers import AutoImageProcessor, AutoModel
        import torch

        self.torch = torch
        self.processor = AutoImageProcessor.from_pretrained(MODEL_ID)
        self.model = (
            AutoModel.from_pretrained(MODEL_ID, torch_dtype=torch.float16)
            .to("cuda")
            .eval()
        )

    def _encode_pil(self, img):
        """Run the encoder + L2-normalise. Returns a Python list of floats.

        Casts pixel_values to fp16 to match the model's dtype (loaded
        with torch_dtype=float16). Without this the conv2d forward
        pass raises "Input type (FloatTensor) and weight type
        (HalfTensor) should be the same."
        """
        img = img.convert("RGB")
        inputs = self.processor(images=img, return_tensors="pt").to("cuda")
        inputs["pixel_values"] = inputs["pixel_values"].to(self.torch.float16)
        with self.torch.no_grad():
            feats = self.model.get_image_features(**inputs)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats[0].cpu().float().tolist()

    @modal.fastapi_endpoint(method="POST")
    def encode(self, payload: dict):
        """
        POST { "url": "<image-url>" }  -- fetches image server-side
        or   { "b64": "<base64-jpeg-or-png>" }
        -> { "embedding": [1152 floats], "model": "siglip2-base-patch16-384" }
        """
        import io
        import base64
        import requests
        from PIL import Image

        if "url" in payload:
            res = requests.get(payload["url"], timeout=15)
            res.raise_for_status()
            img = Image.open(io.BytesIO(res.content))
        elif "b64" in payload:
            img = Image.open(io.BytesIO(base64.b64decode(payload["b64"])))
        else:
            return {"error": "must provide 'url' or 'b64'"}, 400

        embedding = self._encode_pil(img)
        return {"embedding": embedding, "model": "siglip2-base-patch16-384"}

    @modal.fastapi_endpoint(method="GET")
    def health(self):
        """Liveness probe — confirms the container is up and the model is
        loaded. Returns immediately without running inference (the 1x1
        dummy image used previously confused the SigLIP image processor's
        normalize step). For full end-to-end validation, POST a real
        image to the encode endpoint."""
        loaded = hasattr(self, "model") and hasattr(self, "processor")
        return {"ok": loaded, "model": "siglip2-base-patch16-384", "dim": 768}
