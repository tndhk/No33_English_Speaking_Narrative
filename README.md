# My English Narrative AI

自分自身の経験や思考を、自然で印象的な英語ナラティブ（物語）に変換し、スピーキング練習を行うためのAI学習ツール。
質問に答えるだけで、あなただけの英語スクリプトと学習教材が生成されます。

## 機能

- **Narrative Generation**: ユーザーの入力（日本語）から、レベルに合わせた英語ナラティブを生成。
- **Personalized Learning**: 文脈に即した重要表現（Key Phrases）と、理解度を確認するリコールテスト（Recall Test）を提供。
- **Text-to-Speech (TTS)**: 生成されたナラティブを音声で読み上げ。速度調整や文単位のリピート再生が可能。
- **Export**: 学習データをJSON形式でダウンロード、またはクリップボードにコピー。

## 技術スタック (MVP Phase 1)

- **Frontend**: Vanilla JS, Vite
- **Backend**: Cloudflare Pages Functions (API Proxy)
- **AI Model**: Google Gemini 2.0 Flash / 2.5 Flash (via Cloudflare Workers)
- **Fallback**: DeepSeek (Planned)
- **Deployment**: Local Development via Wrangler / Cloudflare Pages

## セットアップ手順

### 前提条件
- Node.js (v18以上)
- Gemini API Key

### インストール

1. リポジトリをクローンまたはダウンロード
2. 依存関係をインストール
   ```bash
   npm install
   ```
3. 環境変数ファイルを作成
   `.dev.vars` ファイルをプロジェクトルートに作成し、APIキーを設定します。
   ```text
   GEMINI_API_KEY=your_gemini_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```

### ローカル実行

以下のコマンドで開発サーバーを起動します。

```bash
npx wrangler pages dev src
```

ブラウザで `http://localhost:8788` にアクセスしてください。

## プロジェクト構造

```
src/
  ├── functions/api/  # Cloudflare Workers (Backend API)
  ├── index.html      # Frontend Entry
  ├── main.js        # Core Logic
  └── style.css      # Styling
prompts/             # System Prompts for LLM
spec.md              # Requirements Spec
```

## 注意事項

- 本プロジェクトはMVP版であり、認証機能やデータ保存機能は実装されていません（Phase 2で予定）。
- ローカル環境での実行を前提としています。
