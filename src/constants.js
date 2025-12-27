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
    description: '今日を振り返って、印象に残った瞬間を記録しよう。',
  },
  {
    id: 'thoughts',
    label: '💭 思考・アイデア',
    description: '思ったこと・感じたことを言葉にしてみよう。',
  },
  {
    id: 'omakase',
    label: '✨ フリースタイル',
    description: '好きなテーマで自由に書く。あなたのペースでOK。',
  },
];

export const CATEGORY_LABELS = {
  today: '📝 日々の記録',
  thoughts: '💭 思考メモ',
  omakase: '✨ 自由記述',
};

export const QUESTIONS = {
  today: ['今日、何があった？', 'そのとき、どう感じた？'],
  thoughts: ['最近、頭から離れないことは？', 'それについて、今どう思う？'],
  omakase: ['今日、記録したいことを自由に書いてください'],
};

export const DAILY_LIMIT = 1;

export const DATE_OPTIONS_EN = {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};
