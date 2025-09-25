import axios from 'axios'

export interface AIResponse {
  content: string
  model: string
}

class AIService {
  private openaiApiKey: string | undefined
  private geminiApiKey: string | undefined

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.geminiApiKey = process.env.GEMINI_API_KEY
  }

  async generateScenario(topic: string): Promise<AIResponse> {
    const prompt = this.createPrompt(topic)

    // Try Gemini first if available, then OpenAI, then fallback
    if (this.geminiApiKey) {
      try {
        return await this.generateWithGemini(prompt)
      } catch (error) {
        console.warn('Gemini API failed, trying OpenAI:', error)
      }
    }

    if (this.openaiApiKey) {
      try {
        return await this.generateWithOpenAI(prompt)
      } catch (error) {
        console.warn('OpenAI API failed, using fallback:', error)
      }
    }

    // Fallback to mock response
    return this.generateFallbackResponse(topic)
  }

  private createPrompt(topic: string): string {
    return `Bạn là một nhà văn sáng tạo chuyên viết những câu chuyện "Nếu như..." thú vị và giàu trí tưởng tượng.

Chủ đề: ${topic}

Hãy viết một viễn cảnh "Nếu như..." dựa trên chủ đề trên với các yêu cầu sau:
1. Độ dài: 2-3 đoạn văn (khoảng 200-300 từ)
2. Nội dung: Sáng tạo, thú vị, không quá viễn vông nhưng đủ độc đáo
3. Phong cách: Dễ hiểu, hấp dẫn, phù hợp với độc giả Việt Nam
4. Tránh nội dung: Bạo lực, chính trị nhạy cảm, tôn giáo
5. Bắt đầu bằng cụm từ "Nếu như..."

Viết bằng tiếng Việt và tạo ra một câu chuyện hấp dẫn!`
  }

  private async generateWithGemini(prompt: string): Promise<AIResponse> {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          key: this.geminiApiKey
        },
        timeout: 30000
      }
    )

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      throw new Error('Invalid Gemini response')
    }

    return {
      content: content.trim(),
      model: 'gemini-pro'
    }
  }

  private async generateWithOpenAI(prompt: string): Promise<AIResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const content = response.data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Invalid OpenAI response')
    }

    return {
      content: content.trim(),
      model: 'gpt-3.5-turbo'
    }
  }

  private generateFallbackResponse(topic: string): AIResponse {
    const fallbackScenarios = [
      `Nếu như ${topic.toLowerCase()}, thế giới sẽ trở thành một nơi hoàn toàn khác biệt. Những quy luật vật lý mà chúng ta từng biết có thể không còn áp dụng, tạo ra những hiện tượng kỳ diệu mà con người chưa từng chứng kiến.

Trong thực tế mới này, con người sẽ phải học cách thích nghi và khám phá những khả năng chưa từng có. Các nhà khoa học sẽ phải viết lại những cuốn sách giáo khoa, còn các nghệ sĩ sẽ tìm thấy nguồn cảm hứng vô tận từ thế giới mới này.

Có lẽ điều quan trọng nhất là chúng ta sẽ học được rằng, dù thế giới có thay đổi như thế nào, tình người và khao khát khám phá vẫn là những giá trị không bao giờ phai nhạt.`,
      
      `Nếu như ${topic.toLowerCase()}, cuộc sống hàng ngày của chúng ta sẽ thay đổi một cách không thể tưởng tượng được. Từ cách chúng ta thức dậy vào buổi sáng đến cách chúng ta kết thúc một ngày, mọi thứ đều mang một màu sắc hoàn toàn mới.

Xã hội sẽ phải thích nghi với những thay đổi này, tạo ra những quy tắc và chuẩn mực mới. Giáo dục, kinh tế, và thậm chí cả cách chúng ta giao tiếp với nhau cũng sẽ được định hình lại.

Nhưng trong tất cả những thay đổi đó, có lẽ điều tuyệt vời nhất là chúng ta sẽ có cơ hội nhìn thế giới từ một góc độ hoàn toàn mới, khám phá những điều kỳ diệu mà trước đây chúng ta chưa bao giờ nghĩ tới.`
    ]

    const randomScenario = fallbackScenarios[Math.floor(Math.random() * fallbackScenarios.length)]
    
    return {
      content: randomScenario,
      model: 'fallback'
    }
  }

  private filterContent(content: string): boolean {
    const inappropriateKeywords = [
      'bạo lực', 'máu', 'giết', 'chết', 'tự tử',
      'chính trị', 'đảng', 'chính phủ', 'tổng thống',
      'tôn giáo', 'phật', 'chúa', 'allah', 'thần'
    ]

    const lowerContent = content.toLowerCase()
    return !inappropriateKeywords.some(keyword => lowerContent.includes(keyword))
  }
}

export default new AIService()