# My English Journal - API Specification Table

## 概要

このドキュメントはアプリケーションのデータアクセスとバックエンドAPIの仕様を記述します。
アーキテクチャは **Supabase (BaaS)** と **Cloudflare Pages Functions (Serverless)** のハイブリッド構成です。

- **Data Access**: クライアントからSupabase SDK (`@supabase/supabase-js`) を介してデータベースに直接アクセス。セキュリティはRLS (Row Level Security) で担保。
- **Generative AI**: 複雑なAI生成処理のみ Cloudflare Pages Functions (`/api/generate`) 経由で実行。

---

## 1. Cloudflare Pages Functions (Backend API)

AI生成ロジックをカプセル化したエンドポイント。

### `POST /api/generate`

ユーザーの日記入力(回答)を元に、AIが英文ナラティブと学習コンテンツを生成する。

- **認証**: 必須 (`Authorization: Bearer <HOST_TOKEN>`)
  - クライアント側でSupabaseのセッションから取得したJWTトークンを使用。

#### Request Body
```json
{
  "category": "string",       // 例: "Business", "Daily Life"
  "answers": [                // ユーザーが入力した日本語の回答リスト
    "今日は会議が長引いて疲れた。",
    "でも、良い議論ができたと思う。"
  ],
  "settings": {
    "length": "Normal",       // "Short" | "Normal" | "Long"
    "tone": "Business"        // "Casual" | "Business" | "Formal"
  }
}
```

#### Response Body (200 OK)
AIが生成したJSONオブジェクト。

```json
{
  "narrative_en": "string",   // 生成された英文日記
  "key_phrases": [            // 重要フレーズ (3-5個)
    {
      "phrase_en": "string",
      "meaning_ja": "string",
      "usage_hint_ja": "string"
    }
  ],
  "alternatives": [           // 言い換え表現 (最大2個)
    {
      "original_en": "string",
      "alternative_en": "string",
      "nuance_ja": "string"
    }
  ],
  "recall_test": {            // 想起テスト用データ
    "prompt_ja": "string",    // 3つの重要ポイント(日本語)
    "expected_points_en": [   // 期待される英語表現のキーワード
      "string",
      "string"
    ]
  },
  "pronunciation": {          // 発音ポイント (Optional, often null)
    "word": "string",
    "ipa": "string",
    "tip_ja": "string"
  }
}
```

#### Error Responses
- **401 Unauthorized**: JWTトークンが無効または欠落。
- **500 Internal Server Error**: AIプロバイダのエラーやサーバー内部エラー。

---

## 2. Supabase Data Access (Client Side)

クライアントから直接アクセスするテーブル構造。
詳細は [ER図 (docs/er_diagram.md)](./er_diagram.md) を参照。

### Narratives (`en_journal_narratives`)

| 操作 | 説明 | RLS Policy |
|-----|------|------------|
| **READ** | 自分の日記一覧・詳細を取得 | `auth.uid() = user_id` |
| **CREATE** | 新しい日記を保存 | `auth.uid() = user_id` |
| **UPDATE** | SRSステータス更新や修正 | `auth.uid() = user_id` |
| **DELETE** | 日記を削除 | `auth.uid() = user_id` |

### Statistics (`en_journal_stats`)

| 操作 | 説明 | RLS Policy |
|-----|------|------------|
| **READ** | 学習統計(継続日数など)を取得 | `auth.uid() = user_id` |
| **CREATE** | 初回ログイン時に自動作成 | Triggerにより自動実行 |
| **UPDATE** | 学習完了時に統計を更新 | `auth.uid() = user_id` |

---

## 3. External AI Providers

`/api/generate` 内部で使用される外部AIサービス。フォールバックロジックにより可用性を確保。

1. **Google Gemini** (`gemini-flash-lite-latest`) - Primary
2. **DeepSeek** (`deepseek-chat`) - Secondary
3. **Grok** (`grok-4-fast`) - Tertiary

*API KeysはCloudflare Pagesの環境変数で管理。*
