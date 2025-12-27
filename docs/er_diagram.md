# kaku (My English Journal) - ER図

## スキーマ概要 (Supabase)

```mermaid
erDiagram
    auth_users ||--o{ en_journal_narratives : "owns"
    auth_users ||--o| en_journal_stats : "has"

    auth_users {
        uuid id PK
        string email
        timestamp created_at
    }

    en_journal_narratives {
        uuid id PK
        uuid user_id FK
        timestamptz created_at
        text category
        text narrative_en
        jsonb key_phrases
        jsonb alternatives
        jsonb recall_test
        jsonb pronunciation
        jsonb user_answers
        jsonb settings
        jsonb srs_data
    }

    en_journal_stats {
        uuid user_id PK_FK
        timestamptz updated_at
        integer total_reviews
        integer current_streak
        integer longest_streak
        date last_review_date
        jsonb reviews_by_date
    }
```

---

## JSONBカラム詳細

### `srs_data`

```json
{
  "interval_index": 0,
  "next_review_date": "2025-12-27",
  "last_reviewed": null,
  "review_count": 0,
  "quality_history": [],
  "status": "new|learning|mastered|suspended",
  "ease_factor": 2.5
}
```

### `recall_test`

```json
{ "prompt_ja": "日本語のプロンプト" }
```

### `key_phrases`

```json
[{ "phrase": "英語フレーズ", "explanation": "説明" }]
```

### `alternatives`

```json
[{ "original": "元の表現", "alternative": "代替表現", "nuance": "ニュアンス" }]
```

### `settings`

```json
{ "length": "Normal", "tone": "Business" }
```

---

_最終更新: 2025-12-27_
