# Model Registry Schema — Review & Suggested Additions

Review of the proposed model registry schema. Grouped by priority: must‑have correctness fixes, missing concepts, and nice‑to‑haves.

---

## 1. Correctness Fixes (must‑haves)

### 1.1 Typos

- `texttospeach` → `texttospeech` (appears in `Specialization.type` enum and as a field name). Schema typos propagate into JSON keys, generated client code, and stored documents — cheap to fix now, painful later.

### 1.2 Enum / naming consistency

The schema mixes conventions:

- `Specialization.type` values are lowercase: `chat`, `translation`, `classification`, `texttospeach`, `speculator`.
- `Accessibility` variants are PascalCase: `Local`, `Remote`.
- `Reference` variants are PascalCase: `HuggingFace`, `Mirai`.

**Recommendation**: use `snake_case` for all JSON enum values; reserve PascalCase for type names in the schema document itself.

### 1.3 Missing discriminators on unions

`Accessibility` and `Reference` are written as tagged unions but have no discriminator field. Clients cannot parse them deterministically.

```yaml
Accessibility
- type: { local, remote }     # <-- add
- local?:  LocalAccessibility
- remote?: RemoteAccessibility

Reference
- type: { huggingface, mirai } # <-- add
- huggingface?: HuggingFaceReference
- mirai?:       MiraiReference
```

Same pattern as `Specialization` already uses — apply consistently.

### 1.4 `entity_identifiers` grammar is under‑specified

The example mixes forms:

```
vendor:alibaba
family:qwen3
model:qwen3:1b:awq:4[composable]
registry:mirai
entity_provider:uzu
```

Questions the schema should answer:

- Is the grammar `<entity_type>:<identifier>`, or can identifiers contain colons (`qwen3:1b:awq:4`)?
- What does the `[composable]` suffix mean? Is it part of the identifier, a flag, or a tag?
- Is `entity_provider` a sixth `Entity.type` value? It is not listed in the enum.

**Recommendation**: formalize the grammar and add `entity_provider` to the `Entity.type` enum if it is meant to exist.

### 1.5 `Entity.identifier` uniqueness scope

Is `qwen3` globally unique, or scoped to its parent vendor? Two vendors could ship a family called `llama2-ft`.

**Recommendation**: declare identifiers as *scoped* (unique within parent) and provide a canonical fully‑qualified form (e.g. `vendor:alibaba/family:qwen3`).

### 1.6 `Hash.method` is too weak

- `md5` is cryptographically broken.
- `crc32c` is a checksum, not a hash — fine for corruption detection, not for integrity verification.

HuggingFace publishes `sha256` for LFS files; you will need it anyway for mirror verification.

**Recommendation**: add `sha256` (required in practice) and `blake3` (fast, modern). Keep `md5`/`crc32c` only if you must interop with legacy sources.

---

## 2. Missing Specializations

The current set (`chat`, `translation`, `classification`, `texttospeech`, `speculator`) omits several common model classes.

### 2.1 `embedding`

Embedding models are *not* classifiers and should not be squeezed into `ClassificationSpecialization`.

```yaml
EmbeddingSpecialization
- dimensions:         uint
- max_input_tokens:   uint
- pooling:            { cls, mean, last, none }
- normalize:          bool
- matryoshka_dims?:   uint[]   # for Matryoshka embedding models
```

### 2.2 `speech_to_text` (ASR)

You have TTS but no STT.

```yaml
SpeechToTextSpecialization
- supported_languages:   string[]   # BCP-47
- supports_streaming:    bool
- supports_diarization:  bool
- max_audio_duration_s?: uint
```

### 2.3 `image_generation`

```yaml
ImageGenerationSpecialization
- max_resolution:            RasterSize
- supported_aspect_ratios:   string[]
- supports_inpainting:       bool
- supports_controlnet:       bool
```

### 2.4 `reranker`

Cross‑encoder rerankers are distinct from classifiers and embeddings.

```yaml
RerankerSpecialization
- max_input_tokens:  uint
- score_range:       { normalized, logit }
```

### 2.5 Flesh out `ChatSpecialization`

Current definition is:

```yaml
ChatSpecialization
- context_length?:    uint64
- supports_reasoning: bool
- supports_tools:     bool
```

Suggested additions:

- `max_output_tokens` — often lower than context length; clients need both.
- `supports_streaming: bool`
- `supports_json_mode: bool`
- `supports_structured_output: bool` (JSON schema / grammar constrained)
- `supports_parallel_tool_calls: bool`
- `supports_vision: bool`, `supports_audio_input: bool` — or defer to a top‑level `modalities` field (see §3.3).

### 2.6 Fill in TTS

`TextToSpeachSpecialization` is a TODO. Minimum viable shape:

```yaml
TextToSpeechSpecialization
- supported_languages: string[]
- voices:              Voice[]
- supports_streaming:  bool
- sample_rates_hz:     uint[]
- output_formats:      { wav, mp3, opus, flac }[]

Voice
- identifier:  string
- name:        string
- language:    string   # BCP-47
- gender?:     { male, female, neutral }
```

### 2.7 Fill in Speculator

`SpeculatorSpecialization` is a TODO. At minimum:

```yaml
SpeculatorSpecialization
- target_models:     string[]   # model ids this speculator accelerates
- draft_length:      uint
- acceptance_rate?:  float      # measured, optional
```

---

## 3. Missing Fields on `Model`

### 3.1 License

Critical for downstream filtering (commercial vs research‑only, copyleft, etc.).

```yaml
License
- spdx_id?:      string   # e.g. "Apache-2.0", "MIT", "other"
- name:          string
- url?:          string
- commercial_use_allowed?: bool
```

### 3.2 Languages

Essential for translation, TTS, STT, and chat models trained for specific locales. BCP‑47 codes.

```yaml
languages: string[]   # e.g. ["en", "ru", "zh-Hans"]
```

### 3.3 Modalities

Declarative top‑level field is cleaner than inferring from specializations.

```yaml
modalities
- inputs:  { text, image, audio, video }[]
- outputs: { text, image, audio, embedding }[]
```

### 3.4 Temporal data

```yaml
created_at:      timestamp
updated_at:      timestamp
released_at?:    timestamp
deprecated_at?:  timestamp
```

### 3.5 Deprecation / lineage

```yaml
deprecated:    bool
replaced_by?:  string     # id of the successor model
base_model?:   string     # id of the base model (for fine-tunes)
is_fine_tune:  bool
```

### 3.6 Discovery

```yaml
tags:             string[]    # ["coding", "math", "instruct", "uncensored"]
aliases?:         string[]    # alternate names clients may look up
model_card_url?:  string
```

### 3.7 Safety

```yaml
safety?
- content_filter_level: { none, low, medium, strict }
- red_team_report_url?: string
```

---

## 4. Missing Fields on `Entity`

```yaml
aliases?:           string[]    # qwen3 ⇔ Qwen3 ⇔ qwen-3
homepage_url?:      string
documentation_url?: string
parent?:            string      # explicit reference to parent entity id
```

Explicit `parent` is cleaner than inferring hierarchy from identifier strings.

---

## 5. `Quantization` (currently TODO)

Current shape:

```yaml
Quantization
- method:          { awq, gptq, mlx }
- bits_per_weight: float
```

Suggested:

```yaml
Quantization
- method:           string     # open vocabulary (awq, gptq, gguf, bnb, exl2, fp8, mlx, rtn, ...)
- bits_per_weight:  float
- activation_bits?: float      # some schemes quantize activations too
- group_size?:      uint       # awq/gptq need it
- symmetric?:       bool
- calibration_dataset?: string
```

Keeping `method` as an open string (with a recommended vocabulary) avoids schema churn as quantization tooling evolves.

---

## 6. `Accessibility.Remote` is under‑specified

Current shape only has `repository?`. A remote model needs an endpoint and auth description:

```yaml
RemoteAccessibility
- endpoint_url:   string
- protocol:       { openai_compatible, anthropic, google, custom }
- auth:
    - type:         { none, api_key, oauth, bearer }
    - header_name?: string    # e.g. "Authorization"
- pricing?:
    - input_per_1m_tokens:   Money
    - output_per_1m_tokens:  Money
    - currency:              string   # ISO 4217
- rate_limits?:
    - requests_per_minute?:  uint
    - tokens_per_minute?:    uint
- repository?:    Repository   # optional source link
```

---

## 7. `File` additions

```yaml
File
- url:          string
- name:         string
- size:         uint
- media_type?:  string    # "application/x-safetensors", "application/x-gguf", ...
- role?:        { weights, tokenizer, config, vocab, documentation, other }
- hashes:       Hash[]
```

`role` lets clients pick what they need without filename heuristics (`tokenizer.json` vs `tokenizer_config.json` vs `special_tokens_map.json`).

---

## 8. `Array` additions

```yaml
Array
- name:          string
- shape:         uint64[]       # <-- add; size-in-bytes alone can't reconstruct the tensor
- size:          uint64         # bytes
- blob_type:     BlobType
- quantization?: Quantization
- offset?:       uint64         # byte offset in a packed blob, if applicable
```

`BlobType` coverage is good; consider also adding `fp8_e4m3` and `fp8_e5m2` (distinct IEEE‑P3109 variants, both in use).

---

## 9. Top‑Level `Response` additions

```yaml
Response
- schema_version: string    # semver; you will rev this
- entities:       Entity[]
- models:         Model[]
- pagination?:
    - next_page_token?: string
    - total_count?:     uint
```

Registries grow; plan for pagination from day one.

---

## 10. `Evals` / `Benchmarks` envelope

Both are marked TODO with `<dynamic fetch>`. Even if values are fetched lazily, clients need the envelope shape now — otherwise you will break API compatibility when you finalize it.

Suggested minimum:

```yaml
Eval
- name:          string     # "mmlu", "gsm8k", "humaneval"
- score:         float
- metric:        string     # "accuracy", "pass@1", "elo"
- source_url?:   string
- measured_at?:  timestamp
- shots?:        uint       # 0, 5, ...
```

---

## 11. Summary Checklist

Minimum set of changes I'd land before shipping v1:

- [ ] Fix `texttospeach` typo
- [ ] Add discriminator fields to `Accessibility` and `Reference`
- [ ] Normalize enum casing across the schema
- [ ] Formalize `entity_identifiers` grammar; add `entity_provider` to `Entity.type` (or rename)
- [ ] Define `Entity.identifier` uniqueness scope
- [ ] Add `sha256` to `Hash.method`
- [ ] Add `embedding`, `speech_to_text`, `image_generation`, `reranker` specializations
- [ ] Expand `ChatSpecialization` (max_output_tokens, streaming, json_mode, parallel tool calls)
- [ ] Fill in `TextToSpeech` and `Speculator` specializations
- [ ] Add `license`, `languages`, `modalities`, `tags`, temporal fields to `Model`
- [ ] Add `deprecated` / `replaced_by` / `base_model`
- [ ] Complete `Quantization` (group_size, activation_bits, open `method`)
- [ ] Complete `Accessibility.Remote` (endpoint, auth, pricing, rate limits)
- [ ] Add `shape` to `Array`
- [ ] Add `schema_version` and `pagination` to `Response`
- [ ] Define the `Eval` / `Benchmark` envelope even if values are fetched dynamically
