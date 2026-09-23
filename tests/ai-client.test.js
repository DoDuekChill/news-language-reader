import { describe, it, expect, vi } from 'vitest';
import { buildSentencePrompt } from '../src/core/prompt-templates.js';
import { AIClient } from '../src/core/ai-client.js';

describe('AI Client and Prompt Chaining', () => {
  it('should format sentence prompt with topic brief and previous sentence context', () => {
    const prompt = buildSentencePrompt({
      sentence: '政府は検討する。',
      words: ['政府', '検討'],
      brief: '토픽: 정부 경제 정책 발표',
      previousContext: '원문: 각료회의가 열렸다. -> 번역: 각료 회의가 열렸다.',
      sourceLang: 'ja',
      targetLangs: ['ko', 'en']
    });

    expect(prompt).toContain('토픽: 정부 경제 정책 발표');
    expect(prompt).toContain('각료 회의가 열렸다.');
    expect(prompt).toContain('政府は検討する。');
    expect(prompt).toContain('JSON');
  });

  it('should parse valid AI JSON response into structured alignments', async () => {
    const mockSession = {
      prompt: vi.fn().mockResolvedValue(`
        {
          "translation_ko": "정부는 검토한다.",
          "translation_en": "The government considers it.",
          "alignments": [
            {
              "src_word": "検討",
              "target_ko": "검토",
              "target_en": "consider",
              "base_form": "検討する",
              "reading": "けんとう",
              "pos": "명사/동사",
              "nuance": "공적 회의에서 신중히 따져볼 때 쓰는 격식 표현"
            }
          ]
        }
      `)
    };

    const client = new AIClient({ mockSession });
    const result = await client.translateSentenceWithContext({
      sentence: '政府は検討する。',
      words: ['検討'],
      brief: '토픽',
      previousContext: '',
      sourceLang: 'ja',
      targetLangs: ['ko', 'en']
    });

    expect(result.translationKo).toBe('정부는 검토한다.');
    expect(result.alignments[0].baseForm).toBe('検討する');
    expect(result.alignments[0].reading).toBe('けんとう');
  });

  it('should report downloading status when capabilities return after-download', async () => {
    global.window = {
      ai: {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'after-download' })
        }
      }
    };

    const client = new AIClient();
    const status = await client.checkAvailability();
    expect(status.status).toBe('downloading');
    expect(status.message).toContain('다운로드');
  });
});
