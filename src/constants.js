/**
 * Application Constants
 * defined to avoid magic numbers and strings throughout the application
 */

export const VIEW = {
  GENERATE: 'generate',
  REVIEW: 'review',
  HISTORY: 'history',
};

export const SETTINGS_DEFAULTS = {
  LENGTH: 'Normal',
  TONE: 'Business',
  VOICE: null,
  RATE: 1.0,
};

export const CATEGORIES = [
  {
    id: 'today',
    label: '📝 今日の出来事',
    description:
      '日々のできごとを英語で記録。今日あった会話やイベントを振り返りながら、自然なジャーナルを作成しましょう。',
  },
  {
    id: 'thoughts',
    label: '💭 思考・アイデア',
    description:
      '頭の中にある考えや感情を言葉に。抽象的なアイデアを英語で整理し、表現力を磨きましょう。',
  },
  {
    id: 'omakase',
    label: '✨ フリースタイル',
    description:
      '好きなテーマで自由に書く。学習したい表現や伝えたいトピックを、あなたのペースで英語に。',
  },
];

export const CATEGORY_LABELS = {
  today: '📝 日々の記録',
  thoughts: '💭 思考メモ',
  omakase: '✨ 自由記述',
};

export const QUESTIONS = {
  today: [
    '今日、印象に残った出来事は何ですか？',
    'そのとき、どんな気持ちでしたか？',
    '振り返って思うことは？',
  ],
  thoughts: [
    '最近、頭から離れないことは何ですか？',
    'なぜ、それが気になるのでしょう？',
    'このことについて、今どう思いますか？',
  ],
  omakase: ['今日、英語で残したいことを自由に書いてください'],
};

export const DAILY_LIMIT = 1;

export const DATE_OPTIONS_EN = {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};
