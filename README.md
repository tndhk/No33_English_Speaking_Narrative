# My English Narrative AI

自分自身の経験や思考を、自然で印象的な英語ナラティブ（物語）に変換し、スピーキング練習を行うためのAI学習ツール。
質問に答えるだけで、あなただけの英語スクリプトと復習教材が生成されます。

## 機能

### コア機能
- **Narrative Generation**: ユーザーの入力（日本語）から、レベルに合わせた英語ナラティブを生成
- **Personalized Learning**: 文脈に即した重要表現（Key Phrases）と、理解度を確認するリコールテスト（Recall Test）を提供
- **Text-to-Speech (TTS)**: 生成されたナラティブを音声で読み上げ。速度調整や文単位のリピート再生が可能

### 学習管理機能
- **SRS (Spaced Repetition System)**: 効率的な反復学習のための復習スケジュール管理
- **Review Dashboard**: 今日の復習項目の一覧表示と進捗管理
- **Statistics**: 学習の統計情報（総復習数、連続日数、習熟度分布など）
- **History**: 過去に生成したナラティブの履歴管理

### データ管理
- **Database**: Supabase を使用したデータ永続化
- **Export/Import**: JSON, CSV, Markdown 形式でのデータエクスポート・インポート

## 技術スタック

- **Frontend**: Vanilla JS, Vite
- **Backend**: Cloudflare Pages Functions (API Proxy)
- **Database**: Supabase (ローカル開発: Docker)
- **AI Model**: Google Gemini 2.0 Flash / 2.5 Flash
- **Deployment**: Cloudflare Pages (予定)

## セットアップ手順

### 前提条件
- Node.js (v18以上)
- Docker (Supabase ローカル実行用)
- Gemini API Key

### インストール

1. リポジトリをクローン
   ```bash
   git clone <repository-url>
   cd EnglishSpeaking251223
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. Supabase CLI をインストール（未インストールの場合）
   ```bash
   npm install -g supabase
   ```

### ローカル環境のセットアップ

1. Supabase をローカルで起動
   ```bash
   npx supabase start
   ```
   
   初回起動時は Docker イメージのダウンロードに時間がかかります。
   起動後、コンソールに表示される `API URL` と `anon key` を確認してください。

2. 環境変数ファイルを作成
   `.env` ファイルをプロジェクトルートに作成し、以下を設定します。
   ```text
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
   ```

3. 開発サーバーを起動
   ```bash
   npm run dev
   ```

4. ブラウザで `http://localhost:5173` にアクセス

### その他の便利なコマンド

```bash
# Supabase の状態確認
npx supabase status

# Supabase の停止
npx supabase stop

# データベースのリセット（マイグレーション再実行）
npx supabase db reset
```

## プロジェクト構造

```
.
├── src/
│   ├── index.html           # Frontend Entry
│   ├── main.js              # Core Logic
│   ├── storage.js           # Supabase Integration
│   ├── supabase.js          # Supabase Client
│   ├── srs.js               # SRS Logic
│   ├── stats.js             # Statistics & Dashboard
│   ├── review-session.js    # Review Session Management
│   ├── export.js            # Export/Import
│   └── style.css            # Styling
├── functions/api/           # Cloudflare Workers (Backend API)
├── supabase/
│   ├── config.toml          # Supabase Configuration
│   └── migrations/          # Database Migrations
├── prompts/                 # System Prompts for LLM
└── spec.md                  # Requirements Spec
```

## 開発の進め方

### ローカル開発フロー

1. `npx supabase start` で Supabase を起動
2. `npm run dev` で開発サーバーを起動
3. ブラウザでアプリを開いて開発
4. コードの変更は自動でリロードされます

### データベースのマイグレーション

新しいテーブルやカラムを追加する場合：

```bash
# 新しいマイグレーションファイルを作成
npx supabase migration new <migration_name>

# SQL を記述後、適用
npx supabase db reset
```

## 注意事項

- 本プロジェクトは個人学習用のMVP版です
- ローカル環境での実行を前提としています
- ユーザー認証機能は未実装です（RLS ポリシーは public read/write）
- 本番環境へのデプロイ時は、適切なセキュリティ設定が必要です

## ライセンス

MIT License

## 関連リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
