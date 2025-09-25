/**
 * Story Hub specific prompts for detailed script generation with ACT structure
 */

const STORY_HUB_PROMPTS = {
  // Main story script generation with ACT structure
  storyScript: {
    systemPrompt: `Bạn là một screenwriter và storyteller chuyên nghiệp, có khả năng tạo ra những kịch bản chi tiết với cấu trúc ACT rõ ràng.

Nhiệm vụ của bạn:
1. Tạo kịch bản chi tiết dựa trên chủ đề "Nếu như..." được đưa ra
2. Sử dụng cấu trúc 3 ACT chuẩn của Hollywood
3. Bao gồm hội thoại, mô tả cảnh, và hướng dẫn diễn xuất
4. Tạo nội dung hấp dẫn, có tính giải trí cao
5. Sử dụng tiếng Việt tự nhiên, dễ hiểu
6. Độ dài 800-1500 từ

Cấu trúc kịch bản:
- ACT 1 (Setup): Giới thiệu nhân vật, bối cảnh, và tình huống "Nếu như..."
- ACT 2 (Confrontation): Phát triển xung đột, khám phá hệ quả của thay đổi
- ACT 3 (Resolution): Giải quyết xung đột, kết thúc có ý nghĩa

Định dạng kịch bản:
- Sử dụng định dạng kịch bản chuẩn
- Bao gồm mô tả cảnh (SCENE), hội thoại (DIALOGUE), và hướng dẫn (ACTION)
- Tạo nhân vật có tính cách rõ ràng
- Sử dụng ngôn ngữ sinh động, dễ hình dung`,

    userPrompt: (topic) => `Hãy tạo một kịch bản chi tiết với cấu trúc 3 ACT cho câu chuyện "Nếu như..." sau:

Chủ đề: "${topic}"

Yêu cầu:
1. Tạo kịch bản hoàn chỉnh với 3 ACT
2. Bao gồm ít nhất 3-5 nhân vật chính
3. Có hội thoại sinh động và mô tả cảnh chi tiết
4. Kết thúc có ý nghĩa và để lại ấn tượng sâu sắc
5. Sử dụng định dạng kịch bản chuẩn

Hãy bắt đầu với:
FADE IN:`
  },

  // Short story version (for quick generation)
  shortStory: {
    systemPrompt: `Bạn là một storyteller chuyên nghiệp, tạo ra những câu chuyện ngắn hấp dẫn.

Nhiệm vụ:
1. Tạo câu chuyện ngắn dựa trên chủ đề "Nếu như..."
2. Cấu trúc đơn giản: Mở đầu - Phát triển - Kết thúc
3. Sử dụng tiếng Việt tự nhiên
4. Độ dài 300-500 từ
5. Tạo nội dung tích cực, phù hợp mọi lứa tuổi`,

    userPrompt: (topic) => `Tạo câu chuyện ngắn cho chủ đề: "${topic}"`
  },

  // Character development prompt
  characterDevelopment: {
    systemPrompt: `Bạn là một character designer chuyên nghiệp.

Nhiệm vụ:
1. Tạo nhân vật phù hợp với câu chuyện "Nếu như..."
2. Mô tả tính cách, ngoại hình, và động cơ
3. Tạo nhân vật đa chiều, thú vị
4. Sử dụng tiếng Việt`,

    userPrompt: (topic) => `Tạo nhân vật chính cho câu chuyện: "${topic}"`
  }
};

/**
 * Generate detailed script with ACT structure
 */
const generateStoryScript = (topic, options = {}) => {
  const promptConfig = STORY_HUB_PROMPTS.storyScript;
  
  return {
    type: 'storyScript',
    systemPrompt: promptConfig.systemPrompt,
    userPrompt: promptConfig.userPrompt(topic),
    options: {
      temperature: options.temperature || 0.8,
      maxTokens: options.maxTokens || 2000,
      includeActs: true,
      includeDialogue: true,
      includeCharacters: true
    }
  };
};

/**
 * Generate short story version
 */
const generateShortStory = (topic, options = {}) => {
  const promptConfig = STORY_HUB_PROMPTS.shortStory;
  
  return {
    type: 'shortStory',
    systemPrompt: promptConfig.systemPrompt,
    userPrompt: promptConfig.userPrompt(topic),
    options: {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 800,
      includeActs: false,
      includeDialogue: false,
      includeCharacters: false
    }
  };
};

/**
 * Post-process script to ensure proper formatting
 */
const postProcessScript = (script) => {
  let processed = script.trim();
  
  // Ensure proper ACT structure
  if (!processed.includes('ACT 1') && !processed.includes('FADE IN')) {
    processed = `FADE IN:\n\n${processed}`;
  }
  
  // Clean up formatting
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/\s+/g, ' ');
  processed = processed.replace(/\n /g, '\n');
  
  // Ensure proper ending
  if (!processed.includes('FADE OUT') && !processed.includes('THE END')) {
    processed += '\n\nFADE OUT.\n\nTHE END.';
  }
  
  return processed;
};

/**
 * Extract characters from script
 */
const extractCharacters = (script) => {
  const characterRegex = /(?:CHARACTER|NARRATOR|VOICE|SPEAKER):\s*([A-Z][A-Z\s]+)/gi;
  const matches = script.match(characterRegex);
  
  if (!matches) return [];
  
  return [...new Set(matches.map(match => 
    match.replace(/(?:CHARACTER|NARRATOR|VOICE|SPEAKER):\s*/i, '').trim()
  ))];
};

/**
 * Extract scenes from script
 */
const extractScenes = (script) => {
  const sceneRegex = /(?:SCENE|ACT)\s*\d*:?\s*([^\n]+)/gi;
  const matches = script.match(sceneRegex);
  
  if (!matches) return [];
  
  return matches.map(match => 
    match.replace(/(?:SCENE|ACT)\s*\d*:?\s*/i, '').trim()
  );
};

/**
 * Calculate script metrics
 */
const calculateScriptMetrics = (script) => {
  const words = script.split(/\s+/).length;
  const characters = script.length;
  const lines = script.split('\n').length;
  const dialogueLines = (script.match(/^[A-Z][A-Z\s]+:/gm) || []).length;
  
  return {
    wordCount: words,
    characterCount: characters,
    lineCount: lines,
    dialogueLines: dialogueLines,
    estimatedDuration: Math.ceil(words / 150) // ~150 words per minute
  };
};

module.exports = {
  STORY_HUB_PROMPTS,
  generateStoryScript,
  generateShortStory,
  postProcessScript,
  extractCharacters,
  extractScenes,
  calculateScriptMetrics
};