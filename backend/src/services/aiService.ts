import { recordBusinessMetric } from '../observability/metrics';

interface AiAssistInput {
  text: string;
  mode: 'summarize' | 'expand';
  assistProfile?: {
    style?: string;
    targetLength?: number;
  };
  contextEntities?: ContextEntity[];
}

interface AiParseManuscriptInput {
  worldId: string;
  bookId?: string;
  text: string;
}

interface AiConflictInput {
  targetEntity: {
    id: string;
    name: string;
    type: string;
    summary: string;
  };
  contextEntities?: ContextEntity[];
  worldContext?: {
    worldId: string;
    worldName: string;
  };
}

interface ContextEntity {
  id: string;
  name: string;
  type: string;
  summary?: string;
}

interface ManuscriptEntitySuggestion {
  name: string;
  type: string;
  summary: string;
  frequency: number;
  confidence: number;
  tags: string[];
}

interface ManuscriptRelationSuggestion {
  fromName: string;
  toName: string;
  type: string;
  confidence: number;
  count: number;
  evidence: string;
}

const ENTITY_STOP_WORDS = new Set([
  '我们',
  '你们',
  '他们',
  '自己',
  '现在',
  '这里',
  '那里',
  '这个',
  '那个',
  '一种',
  '一次',
  '一个',
  '其中',
  '如果',
  '已经',
  '继续',
  '然后',
  '于是',
  '进行',
  '通过',
  '之间',
  '为了',
  '因为',
  '所以',
  '但是',
  '并且',
  '不过',
  '可以',
  '需要',
  '开始',
  '结束',
  '时候',
  '问题',
  '内容',
  '故事',
  '设定',
  '世界',
  '作品',
  '角色'
]);

const LOCATION_SUFFIXES = ['城', '国', '洲', '域', '州', '镇', '村', '山', '谷', '海', '岛', '界', '大陆', '帝国', '王朝'];
const FACTION_SUFFIXES = ['宗', '门', '派', '会', '盟', '堂', '宫', '阁', '殿', '团', '军', '学院'];
const ITEM_SUFFIXES = ['剑', '刀', '枪', '鼎', '丹', '符', '诀', '经', '石', '矿', '晶', '珠', '甲'];
const RELATION_TYPE_KEYWORDS = [
  { type: 'kinship', words: ['父', '母', '兄', '姐', '弟', '妹', '妻', '夫', '子', '女', '家族', '血脉'] },
  { type: 'hostile_to', words: ['敌', '仇', '追杀', '交战', '冲突', '对立', '厮杀'] },
  { type: 'belongs_to', words: ['隶属', '效忠', '旗下', '归属', '加入', '门下'] },
  { type: 'originates_from', words: ['来自', '出身', '起源', '诞生于', '位于'] },
  { type: 'uses', words: ['使用', '施展', '掌握', '持有', '祭出', '修炼'] }
] as const;

export async function entityAssist(input: AiAssistInput) {
  recordBusinessMetric('aiUsed');
  const { text, mode, assistProfile } = input;

  if (!text) {
    throw new Error('文本内容不能为空');
  }

  if (!['summarize', 'expand'].includes(mode)) {
    throw new Error('模式必须是 summarize 或 expand');
  }

  const style = assistProfile?.style || 'neutral';
  const targetLength = assistProfile?.targetLength || (mode === 'summarize' ? 100 : 500);

  if (mode === 'summarize') {
    const summary = text.length > targetLength
      ? text.substring(0, targetLength) + '...'
      : text;

    return {
      result: summary,
      qualityScore: 0.85,
      qualityTier: 'high',
      qualityLabel: '摘要生成',
      strategyVersion: 'v1-local',
      provider: 'local-heuristic',
      model: 'assist-local-v1',
      fallbackType: null,
      fallbackStatus: null,
      fallbackRetriable: false,
      fallbackTraceId: null,
      style,
      assistProfile: {
        style,
        targetLength
      }
    };
  } else {
    const expanded = text + '\n\n以上是关于该主题的详细描述，包含了更多的背景信息和相关细节。';

    return {
      result: expanded,
      qualityScore: 0.80,
      qualityTier: 'medium',
      qualityLabel: '扩写完成',
      strategyVersion: 'v1-local',
      provider: 'local-heuristic',
      model: 'assist-local-v1',
      fallbackType: null,
      fallbackStatus: null,
      fallbackRetriable: false,
      fallbackTraceId: null,
      style,
      assistProfile: {
        style,
        targetLength
      }
    };
  }
}

export async function parseManuscript(input: AiParseManuscriptInput) {
  const worldId = String(input.worldId || '').trim();
  const text = String(input.text || '').trim();

  if (!worldId) {
    throw new Error('缺少世界ID');
  }

  if (!text) {
    throw new Error('书稿内容不能为空');
  }

  const sentenceRows = splitSentences(text);
  const candidateMap = new Map<string, { frequency: number; firstSentenceIndex: number; fromQuote: boolean }>();

  sentenceRows.forEach((sentence, index) => {
    const candidates = extractCandidates(sentence);
    candidates.forEach((item) => {
      const normalized = normalizeCandidate(item.value);
      if (!normalized) return;
      const prev = candidateMap.get(normalized);
      if (prev) {
        prev.frequency += 1;
        prev.fromQuote = prev.fromQuote || item.fromQuote;
      } else {
        candidateMap.set(normalized, {
          frequency: 1,
          firstSentenceIndex: index,
          fromQuote: item.fromQuote
        });
      }
    });
  });

  const sortedCandidates = Array.from(candidateMap.entries())
    .map(([name, meta]) => ({
      name,
      ...meta
    }))
    .filter((item) => item.frequency >= 1)
    .sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      if (a.fromQuote !== b.fromQuote) return a.fromQuote ? -1 : 1;
      return a.firstSentenceIndex - b.firstSentenceIndex;
    })
    .slice(0, 24);

  const suggestions: ManuscriptEntitySuggestion[] = sortedCandidates.map((item) => {
    const sentence = sentenceRows[item.firstSentenceIndex] || '';
    const type = inferEntityType(item.name, sentence);
    const summary = buildEntitySummary(sentence, item.name);
    const confidenceRaw = 0.45 + Math.min(item.frequency, 5) * 0.08 + (item.fromQuote ? 0.12 : 0);
    const confidence = Number(Math.min(0.95, confidenceRaw).toFixed(2));
    return {
      name: item.name,
      type,
      summary,
      frequency: item.frequency,
      confidence,
      tags: buildTagsByType(type)
    };
  });

  const suggestionNames = suggestions.map((item) => item.name);
  const relationMap = new Map<string, ManuscriptRelationSuggestion>();

  sentenceRows.forEach((sentence) => {
    const appearedNames = suggestionNames.filter((name) => sentence.includes(name));
    if (appearedNames.length < 2) return;
    const type = inferRelationType(sentence);
    const confidence = Number((0.56 + Math.min(appearedNames.length, 4) * 0.08).toFixed(2));

    for (let i = 0; i < appearedNames.length; i += 1) {
      for (let j = i + 1; j < appearedNames.length; j += 1) {
        const fromName = appearedNames[i];
        const toName = appearedNames[j];
        if (fromName === toName) continue;
        const key = `${fromName}::${toName}::${type}`;
        const prev = relationMap.get(key);
        if (prev) {
          prev.count += 1;
          continue;
        }
        relationMap.set(key, {
          fromName,
          toName,
          type,
          confidence,
          count: 1,
          evidence: sentence.slice(0, 80)
        });
      }
    }
  });

  const relationSuggestions = Array.from(relationMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.confidence - a.confidence;
    })
    .slice(0, 32);

  return {
    worldId,
    bookId: String(input.bookId || '').trim() || null,
    suggestions,
    relationSuggestions,
    provider: 'local-heuristic',
    model: 'manuscript-parser-v1',
    strategyVersion: 'manuscript-v1-local',
    stats: {
      characters: text.length,
      sentences: sentenceRows.length,
      suggestions: suggestions.length,
      relationSuggestions: relationSuggestions.length
    }
  };
}

export async function entityConflict(input: AiConflictInput) {
  recordBusinessMetric('aiUsed');
  const { targetEntity, contextEntities, worldContext } = input;

  if (!targetEntity?.name) {
    throw new Error('目标实体名称不能为空');
  }

  const conflicts = [];

  for (const entity of contextEntities) {
    if (entity.id === targetEntity.id) continue;

    const nameSimilarity = calculateSimilarity(targetEntity.name, entity.name);
    const typeMatch = targetEntity.type === entity.type;

    if (nameSimilarity > 0.7 || (nameSimilarity > 0.5 && typeMatch)) {
      conflicts.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        reasonCode: nameSimilarity > 0.9 ? 'exact_name_duplicate' : 'name_similar',
        confidence: nameSimilarity,
        riskLevel: nameSimilarity > 0.9 ? 'high' : nameSimilarity > 0.7 ? 'medium' : 'low',
        note: `与 "${entity.name}" 存在名称相似性（${Math.round(nameSimilarity * 100)}%）`
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    distribution: {
      high: conflicts.filter(c => c.riskLevel === 'high').length,
      medium: conflicts.filter(c => c.riskLevel === 'medium').length,
      low: conflicts.filter(c => c.riskLevel === 'low').length
    },
    calibration: {
      similarity: {
        name: 0.7,
        summary: 0.65
      },
      risk: {
        high: 0.9,
        medium: 0.75
      },
      rowLimit: 10
    },
    strategyVersion: 'v1-local',
    provider: 'local-heuristic',
    model: 'conflict-local-v1',
    worldContext: worldContext || null
  };
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.includes(shorter)) return shorter.length / longer.length;

  let matchCount = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matchCount++;
    }
  }

  return matchCount / longer.length;
}

export async function reportAiFeedback(
  type: 'assist' | 'conflict',
  feedback: {
    isPositive: boolean;
    traceId?: string;
    comment?: string;
  }
) {
  console.log(`[AI Feedback] Type: ${type}, Positive: ${feedback.isPositive}, TraceId: ${feedback.traceId}`);

  return {
    success: true,
    message: '反馈已记录'
  };
}

export async function generateImage(input: {
  prompt: string;
  entityType: 'character' | 'location' | 'item';
  style?: string;
}) {
  const { prompt, entityType, style = 'realistic' } = input;

  if (!prompt) {
    throw new Error('生成图片的提示词不能为空');
  }

  // 这里应该调用实际的图片生成API
  // 目前返回模拟数据
  return {
    imageUrl: `https://neeko-copilot.bytedance.net/api/text2image?prompt=${encodeURIComponent(prompt)}&size=512x512`,
    prompt: prompt,
    style: style,
    entityType: entityType,
    strategyVersion: 'v0-local'
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCandidate(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.length < 2 || value.length > 14) return '';
  if (ENTITY_STOP_WORDS.has(value)) return '';
  if (/^[0-9]+$/.test(value)) return '';
  if (/^(第一|第二|第[一二三四五六七八九十])/.test(value)) return '';
  return value;
}

function extractCandidates(sentence: string): Array<{ value: string; fromQuote: boolean }> {
  const output: Array<{ value: string; fromQuote: boolean }> = [];
  const quotePattern = /[「『“《]([^「」『』“”《》]{2,20})[」』”》]/g;
  const nounPattern = /[\u4e00-\u9fa5]{2,10}|[A-Za-z][A-Za-z0-9_-]{1,23}/g;

  for (const match of sentence.matchAll(quotePattern)) {
    const value = String(match[1] || '').trim();
    if (value) output.push({ value, fromQuote: true });
  }

  for (const match of sentence.matchAll(nounPattern)) {
    const value = String(match[0] || '').trim();
    if (!value) continue;
    if (value.length === 2 && !/[A-Za-z]/.test(value)) {
      const prev = sentence[sentence.indexOf(value) - 1] || '';
      if (['的', '了', '在', '和', '与', '对'].includes(prev)) continue;
    }
    output.push({ value, fromQuote: false });
  }

  return output;
}

function inferEntityType(name: string, sentence: string): string {
  const value = String(name || '');
  if (LOCATION_SUFFIXES.some((suffix) => value.endsWith(suffix))) return 'location';
  if (FACTION_SUFFIXES.some((suffix) => value.endsWith(suffix))) return 'faction';
  if (ITEM_SUFFIXES.some((suffix) => value.endsWith(suffix))) {
    if (value.endsWith('矿') || value.endsWith('矿石')) return 'mineral';
    return 'item';
  }
  if (/矿|矿石|晶/.test(value)) return 'mineral';
  if (/妖|兽|龙|灵/.test(value) && /兽|龙/.test(value)) return 'creature';
  if (/(城|国|州|海|山|岛|界)/.test(sentence) && sentence.includes(value)) return 'location';
  if (/(宗|门|派|会|盟|宫|阁|殿|团|军|学院)/.test(sentence) && sentence.includes(value)) return 'faction';
  if (/(先生|小姐|掌门|长老|弟子|少年|少女|大人)/.test(sentence) && sentence.includes(value)) return 'character';
  return 'other';
}

function buildEntitySummary(sentence: string, name: string): string {
  const text = String(sentence || '').trim();
  if (!text) return `${name}（待补充设定描述）`;
  if (text.length <= 120) return text;
  return `${text.slice(0, 120)}…`;
}

function buildTagsByType(type: string): string[] {
  if (type === 'character') return ['人物'];
  if (type === 'location') return ['地点'];
  if (type === 'faction') return ['势力'];
  if (type === 'item') return ['物品'];
  if (type === 'mineral') return ['矿石'];
  if (type === 'creature') return ['生物'];
  if (type === 'event') return ['事件'];
  if (type === 'law') return ['规则'];
  return ['书稿提取'];
}

function inferRelationType(sentence: string): string {
  const text = String(sentence || '');
  const matched = RELATION_TYPE_KEYWORDS.find((item) => item.words.some((word) => text.includes(word)));
  return matched ? matched.type : 'related_to';
}

interface SemanticSearchInput {
  query: string;
  entities: Array<{
    id: string;
    name: string;
    summary: string;
    type: string;
    tags: string;
  }>;
  limit?: number;
}

interface SemanticSearchResult {
  id: string;
  name: string;
  score: number;
  snippet: string;
}

export async function semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResult[]> {
  const { query, entities, limit = 10 } = input;
  
  if (!query || !entities || entities.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const results: SemanticSearchResult[] = [];

  for (const entity of entities) {
    let score = 0;
    
    // 名称匹配
    if (entity.name.toLowerCase().includes(queryLower)) {
      score += 0.6;
    }
    
    // 摘要匹配
    if (entity.summary && entity.summary.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }
    
    // 标签匹配
    if (entity.tags && entity.tags.toLowerCase().includes(queryLower)) {
      score += 0.1;
    }
    
    // 类型匹配
    if (entity.type && entity.type.toLowerCase().includes(queryLower)) {
      score += 0.1;
    }

    if (score > 0) {
      // 生成摘要片段
      let snippet = entity.summary || '';
      if (snippet.length > 100) {
        const index = snippet.toLowerCase().indexOf(queryLower);
        if (index >= 0) {
          const start = Math.max(0, index - 30);
          const end = Math.min(snippet.length, index + query.length + 30);
          snippet = '...' + snippet.substring(start, end) + '...';
        } else {
          snippet = snippet.substring(0, 100) + '...';
        }
      }

      results.push({
        id: entity.id,
        name: entity.name,
        score,
        snippet
      });
    }
  }

  // 按分数排序并返回前N个结果
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
