# Video Generation + Text-to-Speech Feature Guide

## 📋 Tổng quan

Tính năng Video Generation + Text-to-Speech cho phép tạo video 3D từ prompt "what if" kèm theo thuyết trình bằng giọng nói Google.

## 🎯 Tính năng chính

### 1. **Video Generation**
- Tạo video 3D từ text prompt
- Hỗ trợ nhiều provider: Runway ML, Pika Labs, Stability AI
- Tùy chỉnh duration, resolution, style, fps
- Auto fallback giữa các provider

### 2. **Text-to-Speech (TTS)**
- Chuyển đổi text thành giọng nói bằng Google Cloud TTS
- Hỗ trợ tiếng Việt với giọng nam Bắc tự nhiên
- Tùy chỉnh tốc độ nói, pitch, volume
- Hỗ trợ SSML markup

### 3. **Video + Audio Combination**
- Tự động kết hợp video với audio narration
- Đồng bộ hóa timing
- Xuất file MP4 hoàn chỉnh

## 🚀 Setup và Cấu hình

### Bước 1: Cấu hình Google Cloud TTS

```bash
# 1. Tạo Google Cloud Project
# 2. Enable Text-to-Speech API
# 3. Tạo Service Account và download JSON key

# Copy service account key vào thư mục credentials
mkdir -p /workspace/what-if-generator/credentials
cp /path/to/your/service-account-key.json /workspace/what-if-generator/credentials/
```

### Bước 2: Cấu hình Video Generation APIs

```bash
# Thêm API keys vào .env file
RUNWAY_API_KEY=your-runway-api-key
PIKA_API_KEY=your-pika-api-key  
STABILITY_API_KEY=your-stability-api-key
```

### Bước 3: Khởi động services

```bash
# Khởi động tất cả services bao gồm video-service
cd /workspace/what-if-generator
docker-compose up -d

# Kiểm tra video service
curl http://localhost:3005/health
```

## 📚 API Usage

### 1. **Tạo Video với Narration**

```bash
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "scenarioText": "Nếu như con người có thể bay, thế giới sẽ như thế nào?",
    "videoOptions": {
      "duration": 15,
      "resolution": "1280x720",
      "style": "cinematic"
    },
    "ttsOptions": {
      "voiceName": "vi-VN-Wavenet-A",
      "speakingRate": 0.9,
      "pitch": -2.0
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Video với thuyết trình đã được tạo thành công",
  "data": {
    "jobId": "uuid-here",
    "video": {
      "id": "video-id",
      "fileName": "video_uuid.mp4",
      "duration": 15,
      "resolution": "1280x720"
    },
    "audio": {
      "id": "audio-id", 
      "fileName": "tts_uuid.mp3",
      "duration": 12,
      "voice": "vi-VN-Wavenet-A"
    },
    "combined": {
      "filePath": "outputs/combined/video_with_narration_uuid.mp4"
    }
  }
}
```

### 2. **Tạo Video Only**

```bash
curl -X POST http://localhost:3000/api/video/generate-video-only \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a cinematic 3D animation of flying humans in a futuristic city",
    "options": {
      "duration": 10,
      "resolution": "1920x1080",
      "style": "realistic"
    }
  }'
```

### 3. **Tạo TTS Only**

```bash
curl -X POST http://localhost:3000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Nếu như con người có thể bay, thế giới sẽ như thế nào?",
    "options": {
      "voiceName": "vi-VN-Wavenet-A",
      "speakingRate": 0.9,
      "pitch": -2.0
    }
  }'
```

### 4. **Lấy danh sách giọng nói**

```bash
curl http://localhost:3000/api/tts/voices?languageCode=vi-VN
```

### 5. **Tải xuống file**

```bash
# Tải video
curl -O http://localhost:3000/api/video/download/JOB_ID

# Tải audio  
curl -O http://localhost:3000/api/tts/download/AUDIO_ID
```

## 🎨 Frontend Integration

### React Component Example

```jsx
import React, { useState } from 'react';

const VideoGenerator = () => {
  const [scenarioText, setScenarioText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const generateVideo = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          scenarioText,
          videoOptions: {
            duration: 15,
            resolution: '1280x720',
            style: 'cinematic'
          },
          ttsOptions: {
            voiceName: 'vi-VN-Wavenet-A',
            speakingRate: 0.9,
            pitch: -2.0
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch (error) {
      console.error('Error generating video:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="video-generator">
      <h2>Tạo Video What If</h2>
      
      <textarea
        value={scenarioText}
        onChange={(e) => setScenarioText(e.target.value)}
        placeholder="Nhập nội dung viễn cảnh của bạn..."
        rows={5}
      />
      
      <button 
        onClick={generateVideo} 
        disabled={isGenerating || !scenarioText.trim()}
      >
        {isGenerating ? 'Đang tạo video...' : 'Tạo Video'}
      </button>

      {result && (
        <div className="result">
          <h3>Video đã tạo thành công!</h3>
          <video controls src={`/api/video/download/${result.jobId}`}>
            Your browser does not support the video tag.
          </video>
          <p>Thời lượng: {result.video.duration}s</p>
          <p>Giọng nói: {result.audio.voice}</p>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
```

## ⚙️ Configuration Options

### Video Generation Options

```javascript
const videoOptions = {
  duration: 10,           // 5-60 seconds
  resolution: '1280x720', // 1280x720, 1920x1080, 720x1280, 1080x1920
  style: 'cinematic',     // cinematic, realistic, cartoon, anime, documentary
  fps: 24,               // 12-60 fps
  seed: 12345            // Optional seed for reproducible results
};
```

### TTS Options

```javascript
const ttsOptions = {
  languageCode: 'vi-VN',                    // Language code
  voiceName: 'vi-VN-Wavenet-A',            // Voice name
  gender: 'NEUTRAL',                       // NEUTRAL, FEMALE, MALE
  speakingRate: 0.9,                      // 0.25-4.0 (0.9 = 90% speed)
  pitch: -2.0,                            // -20.0 to 20.0 semitones
  volumeGainDb: 2.0,                      // -96.0 to 16.0 dB
  audioEncoding: 'MP3'                    // MP3, LINEAR16, OGG_OPUS
};
```

## 🔧 Rate Limiting

### Video Generation Limits
- **Anonymous**: 1 video/hour
- **Authenticated**: 5 videos/hour  
- **Premium**: 20 videos/hour
- **Admin**: 100 videos/hour

### TTS Limits
- **Anonymous**: 10 requests/15min
- **Authenticated**: 50 requests/15min
- **Premium**: 100 requests/15min
- **Admin**: 1000 requests/15min

## 📊 Monitoring và Health Checks

### Service Health
```bash
# Check video service health
curl http://localhost:3005/health

# Check TTS health
curl http://localhost:3005/tts/health

# Check provider status
curl http://localhost:3005/video/providers
```

### Logs
```bash
# View video service logs
docker logs what-if-video-service -f

# View specific log files
tail -f /workspace/what-if-generator/services/video-service/logs/combined.log
```

## 🗂️ File Management

### Directory Structure
```
/workspace/what-if-generator/services/video-service/
├── outputs/
│   ├── videos/          # Generated videos
│   ├── audio/           # Generated audio files
│   └── combined/        # Video + audio combined
├── uploads/             # Temporary uploads
├── temp/                # Temporary processing files
└── logs/                # Service logs
```

### Cleanup
```bash
# Manual cleanup via API
curl -X POST http://localhost:3005/video/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAgeHours": 24}'

curl -X POST http://localhost:3005/tts/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAgeHours": 24}'
```

## 🚨 Troubleshooting

### Common Issues

**1. TTS Service not available**
```bash
# Check Google Cloud credentials
ls -la /workspace/what-if-generator/credentials/

# Verify environment variables
docker exec what-if-video-service env | grep GOOGLE
```

**2. Video generation fails**
```bash
# Check API keys
docker exec what-if-video-service env | grep API_KEY

# Check provider status
curl http://localhost:3005/video/providers
```

**3. File download issues**
```bash
# Check file permissions
docker exec what-if-video-service ls -la /app/outputs/

# Check disk space
docker exec what-if-video-service df -h
```

### Debug Mode
```bash
# Enable debug logging
docker-compose exec video-service env LOG_LEVEL=debug

# View detailed logs
docker logs what-if-video-service --tail 100
```

## 💡 Best Practices

### 1. **Prompt Optimization**
```javascript
// Good prompt for video generation
const goodPrompt = `
  Create a cinematic 3D animation showing: "Nếu như con người có thể bay"
  
  Style: Futuristic, high-quality 3D animation
  Camera: Dynamic camera movements showing flying people
  Lighting: Dramatic and atmospheric
  Duration: 10-15 seconds
  Resolution: 1280x720
  
  Show people flying over a modern city with clean air and green spaces.
`;

// Bad prompt (too vague)
const badPrompt = "People flying";
```

### 2. **TTS Text Preparation**
```javascript
// Good text for TTS
const goodText = `
  Nếu như con người có thể bay, thế giới sẽ như thế nào? 
  Hãy tưởng tượng một tương lai nơi mỗi người đều có khả năng bay lượn tự do trên bầu trời.
`;

// Add pauses for better narration
const textWithPauses = `
  Nếu như con người có thể bay, <break time="1s"/> 
  thế giới sẽ như thế nào? <break time="2s"/>
  Hãy tưởng tượng một tương lai tuyệt vời.
`;
```

### 3. **Error Handling**
```javascript
const generateVideoWithRetry = async (payload, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
    }
  }
};
```

## 🔮 Future Enhancements

### Planned Features
1. **Batch Processing**: Tạo nhiều video cùng lúc
2. **Video Templates**: Pre-defined video styles
3. **Custom Voices**: Upload và sử dụng giọng nói riêng
4. **Video Editing**: Basic video editing capabilities
5. **Real-time Generation**: WebSocket cho real-time progress
6. **Mobile Optimization**: Optimize cho mobile devices

### Integration Ideas
1. **Social Media**: Auto-upload lên YouTube, TikTok
2. **Email Sharing**: Send video qua email
3. **QR Code**: Generate QR code cho video
4. **Analytics**: Track video performance metrics

## 📞 Support

Nếu gặp vấn đề, hãy:
1. Check logs: `docker logs what-if-video-service`
2. Verify configuration: `curl http://localhost:3005/health`
3. Check API documentation: `http://localhost:3005/api-docs`
4. Contact team qua GitHub Issues