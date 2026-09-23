import { describe, it, expect } from 'vitest';
import { exportToMarkdown, exportToCSV } from '../src/storage/exporters.js';

describe('Storage and Exporters Module', () => {
  const sampleSession = {
    sessionId: 'test_123',
    meta: {
      title: '일본 경제 정책 발표',
      url: 'https://nhk.or.jp/test',
      sourceLang: 'ja',
      targetLangs: ['ko', 'en'],
      createdAt: '2026-09-23T12:00:00Z'
    },
    sentences: [
      {
        sentenceId: 's_0',
        originalText: '政府は検討する。',
        translationKo: '정부는 검토한다.',
        translationEn: 'The government considers it.'
      }
    ],
    words: [
      {
        wordId: 's_0_w_1',
        surface: '検討',
        reading: 'けんとう',
        baseForm: '検討する',
        pos: '명사/동사',
        translationKo: '검토',
        translationEn: 'consideration, review',
        nuance: '공적 회의에서 신중히 따져볼 때 쓰는 격식 표현',
        contextSentenceId: 's_0'
      }
    ]
  };

  it('should export session to clean Markdown without emoticons', () => {
    const md = exportToMarkdown(sampleSession);
    expect(md).toContain('# 일본 경제 정책 발표');
    expect(md).toContain('출처: https://nhk.or.jp/test');
    expect(md).toContain('## 1. 맥락 기반 학습 문장');
    expect(md).toContain('検討する');
    expect(md).toContain('けんとう');
    // Ensure no emojis
    expect(/[\u{1F300}-\u{1F9FF}]/u.test(md)).toBe(false);
  });

  it('should export session words to standard CSV with headers', () => {
    const csv = exportToCSV(sampleSession);
    expect(csv).toContain('원문단어,기본형,발음,품사,한국어뜻,영어뜻,뉘앙스,출처문장');
    expect(csv).toContain('"検討","検討する","けんとう","명사/동사","검토"');
  });
});
