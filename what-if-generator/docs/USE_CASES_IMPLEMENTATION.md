# What If Generator - Implementation của Use Cases

## Tổng Quan

Tài liệu này mô tả cách implement các Use Cases trong hệ thống What If Generator, mapping từ yêu cầu nghiệp vụ đến code implementation.

---

## UC-001: Tạo viễn cảnh mới

### Luồng Implementation

1. **Frontend** (React):
   ```typescript
   // components/ScenarioGenerator.tsx
   const generateScenario = async (topic: string) => {
     const response = await apiService.generateScenario({
       topic,
       options: { promptType: 'default' }
     });
     return response.data.scenario;
   };
   ```

2. **API Gateway** (Express):
   ```javascript
   // Routing: POST /api/generate → Generation Service
   app.use('/api/generate', proxyToGenerationService);
   ```

3. **Generation Service** (Node.js):
   ```javascript
   // controllers/generationController.js
   async generateScenario(req, res) {
     const { topic, options } = req.body;
     const scenario = await aiService.generateScenario(topic, options);
     
     // Save to history if user authenticated
     if (req.user?.id) {
       await saveToHistory(req.user.id, scenario);
     }
     
     res.json({ success: true, data: { scenario } });
   }
   ```

4. **AI Integration** (Google Gemini):
   ```javascript
   // services/aiProviders/geminiProvider.js
   async generateScenario(systemPrompt, userPrompt, options) {
     const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
     const result = await model.generateContent(fullPrompt);
     return result.response.text();
   }
   ```

5. **History Service** (MongoDB):
   ```javascript
   // Auto-save generated scenario
   const scenario = new Scenario({
     scenarioId: generatedScenario.id,
     userId: userId,
     topic: topic,
     content: generatedContent,
     promptType: options.promptType,
     generatedAt: new Date()
   });
   await scenario.save();
   ```

### Error Handling
- **Topic validation**: Min 3, max 200 characters
- **Content filtering**: Block inappropriate topics
- **Rate limiting**: 50 requests/15min authenticated, 10/15min anonymous
- **Timeout handling**: 30-second timeout cho AI generation
- **Fallback**: Retry với different providers nếu primary fails

---

## UC-002: Đăng ký tài khoản

### Implementation Flow

1. **Frontend Form Validation**:
   ```typescript
   // hooks/useRegisterForm.ts
   const validateRegisterForm = (data: RegisterData) => {
     const errors: FormErrors = {};
     
     if (!isValidEmail(data.email)) {
       errors.email = 'Email không hợp lệ';
     }
     
     if (!isStrongPassword(data.password)) {
       errors.password = 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số';
     }
     
     return errors;
   };
   ```

2. **API Gateway Routing**:
   ```javascript
   // Routes POST /api/auth/register → User Service
   '/api/auth/register': { service: 'user', target: '/auth/register' }
   ```

3. **User Service Processing**:
   ```javascript
   // controllers/authController.js
   async register(req, res) {
     const { email, password, firstName, lastName } = req.body;
     
     // Check if user exists
     const existingUser = await User.findOne({ where: { email } });
     if (existingUser) {
       return res.status(409).json({
         success: false,
         message: 'Email này đã được sử dụng'
       });
     }
     
     // Create user with hashed password
     const user = await User.create({
       email,
       password, // Will be auto-hashed by Sequelize hook
       firstName,
       lastName,
       emailVerificationToken: crypto.randomBytes(32).toString('hex')
     });
     
     // Send verification email
     await sendEmailVerification(email, user.emailVerificationToken);
     
     // Generate JWT tokens
     const tokens = generateTokenPair(user);
     
     res.status(201).json({
       success: true,
       message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.',
       data: { user: user.toJSON(), ...tokens }
     });
   }
   ```

4. **Database Storage** (PostgreSQL):
   ```sql
   INSERT INTO users (
     id, email, password, first_name, last_name, 
     email_verification_token, created_at
   ) VALUES (
     uuid_generate_v4(), $1, $2, $3, $4, $5, NOW()
   );
   ```

5. **Email Verification**:
   ```javascript
   // utils/email.js
   const sendEmailVerification = async (email, token) => {
     const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
     
     await transporter.sendMail({
       to: email,
       subject: 'Xác thực email - What If Generator',
       html: emailTemplate.verification(verificationUrl)
     });
   };
   ```

---

## UC-003: Đăng nhập

### Security Implementation

1. **Rate Limiting**:
   ```javascript
   // middleware/rateLimiter.js
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 10, // 10 attempts per IP
     skipSuccessfulRequests: true
   });
   ```

2. **Account Lockout**:
   ```javascript
   // models/User.js
   User.prototype.incrementLoginAttempts = async function() {
     const updates = { loginAttempts: this.loginAttempts + 1 };
     
     // Lock account after 5 failed attempts for 2 hours
     if (this.loginAttempts + 1 >= 5) {
       updates.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
     }
     
     return this.update(updates);
   };
   ```

3. **Password Verification**:
   ```javascript
   // Login controller
   const isPasswordValid = await user.comparePassword(password);
   if (!isPasswordValid) {
     await user.incrementLoginAttempts();
     return res.status(401).json({
       success: false,
       message: 'Email hoặc mật khẩu không chính xác'
     });
   }
   ```

4. **JWT Generation**:
   ```javascript
   // utils/jwt.js
   const generateTokenPair = (user) => {
     const payload = { id: user.id, email: user.email };
     
     return {
       accessToken: jwt.sign(payload, JWT_SECRET, { 
         expiresIn: '24h',
         issuer: 'what-if-generator',
         audience: 'what-if-generator-users'
       }),
       refreshToken: jwt.sign(payload, JWT_SECRET, { 
         expiresIn: '7d' 
       })
     };
   };
   ```

---

## UC-004: Xem lịch sử viễn cảnh

### Data Flow Implementation

1. **Frontend Pagination**:
   ```typescript
   // hooks/useScenarios.ts
   const useScenarios = (params: SearchParams) => {
     return useQuery(['scenarios', params], 
       () => apiService.getMyScenarios(params),
       {
         keepPreviousData: true,
         staleTime: 5 * 60 * 1000 // 5 minutes
       }
     );
   };
   ```

2. **API Gateway → History Service**:
   ```javascript
   // Route: GET /api/scenarios/my → History Service
   const serviceMatch = findServiceByPath('/api/scenarios/my');
   // → routes to history-service:3003/scenarios/my
   ```

3. **History Service Query**:
   ```javascript
   // controllers/scenarioController.js
   async getUserScenarios(req, res) {
     const userId = req.user.id;
     const { page, limit, sort, order, promptType, isFavorite, tags } = req.query;
     
     // Build MongoDB query
     const filter = { isDeleted: false };
     if (promptType) filter.promptType = promptType;
     if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
     if (tags) {
       filter.tags = { $in: tags.split(',') };
     }
     
     const scenarios = await Scenario.findByUserId(userId, {
       filter,
       sort: { [sort]: order === 'desc' ? -1 : 1 },
       limit: parseInt(limit),
       skip: (page - 1) * limit
     });
     
     res.json({ success: true, data: { scenarios, pagination } });
   }
   ```

4. **MongoDB Aggregation**:
   ```javascript
   // Optimized query với indexes
   db.scenarios.find({
     userId: "user_123",
     isDeleted: false,
     promptType: "fantasy",
     tags: { $in: ["thú vị", "khoa học"] }
   })
   .sort({ createdAt: -1 })
   .limit(20)
   .skip(0)
   ```

---

## UC-005: Quên mật khẩu

### Security Implementation

1. **Password Reset Request**:
   ```javascript
   // controllers/authController.js
   async forgotPassword(req, res) {
     const { email } = req.body;
     const user = await User.findOne({ where: { email } });
     
     if (!user) {
       // Security: Don't reveal if email exists
       return res.json({
         success: true,
         message: 'Nếu email tồn tại, bạn sẽ nhận được liên kết reset.'
       });
     }
     
     // Generate secure reset token
     const resetToken = crypto.randomBytes(32).toString('hex');
     const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
     
     await user.update({
       passwordResetToken: resetToken,
       passwordResetExpires: resetExpires
     });
     
     await sendPasswordReset(email, resetToken);
   }
   ```

2. **Email Template**:
   ```javascript
   // utils/email.js
   const sendPasswordReset = async (email, resetToken) => {
     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
     
     await transporter.sendMail({
       to: email,
       subject: 'Đặt lại mật khẩu - What If Generator',
       html: `
         <h2>Đặt lại mật khẩu</h2>
         <p>Nhấp vào liên kết để đặt lại mật khẩu:</p>
         <a href="${resetUrl}">Đặt lại mật khẩu</a>
         <p>Liên kết sẽ hết hạn sau 1 giờ.</p>
       `
     });
   };
   ```

3. **Token Verification**:
   ```javascript
   async resetPassword(req, res) {
     const { token, password } = req.body;
     
     const user = await User.findOne({
       where: {
         passwordResetToken: token,
         passwordResetExpires: { [Op.gt]: new Date() }
       }
     });
     
     if (!user) {
       return res.status(400).json({
         success: false,
         message: 'Token không hợp lệ hoặc đã hết hạn'
       });
     }
     
     await user.update({
       password: password, // Auto-hashed
       passwordResetToken: null,
       passwordResetExpires: null
     });
   }
   ```

---

## UC-006: Chia sẻ viễn cảnh

### Sharing Implementation

1. **Create Share**:
   ```javascript
   // sharing-service/controllers/sharingController.js
   async createShare(req, res) {
     const { scenarioId } = req.params;
     const userId = req.user.id;
     const options = req.body;
     
     // Get scenario from history service
     const scenarioData = await getScenarioData(scenarioId, userId);
     
     // Generate unique share URL
     const shareUrl = uuidv4();
     
     const sharedScenario = new SharedScenario({
       scenarioId,
       userId,
       shareUrl,
       scenarioData,
       ...options
     });
     
     await sharedScenario.save();
     
     // Generate QR code
     const qrCodeUrl = `/qr/${shareUrl}`;
     
     res.json({
       success: true,
       data: {
         shareUrl,
         fullUrl: `${process.env.FRONTEND_URL}/shared/${shareUrl}`,
         qrCodeUrl
       }
     });
   }
   ```

2. **QR Code Generation**:
   ```javascript
   // services/sharingService.js
   async generateQRCode(shareUrl) {
     const sharedScenario = await SharedScenario.findByShareUrl(shareUrl);
     const qrCodeDataUrl = await QRCode.toDataURL(
       sharedScenario.fullShareUrl,
       { width: 200, errorCorrectionLevel: 'M' }
     );
     
     // Record QR generation as share event
     await this.recordShare(shareUrl, 'qr');
     
     return qrCodeDataUrl;
   }
   ```

3. **Social Media Integration**:
   ```typescript
   // Frontend: components/SocialShareButtons.tsx
   const socialShareOptions = {
     facebook: {
       url: shareUrl,
       quote: scenario.topic,
       hashtag: scenario.tags.join(',')
     },
     twitter: {
       url: shareUrl,
       title: scenario.topic,
       hashtags: scenario.tags
     }
   };
   ```

---

## UC-007: Gắn thẻ (Tagging)

### Tagging System Implementation

1. **Frontend Tag Input**:
   ```typescript
   // components/TagInput.tsx
   const TagInput = ({ tags, onChange, maxTags = 10 }) => {
     const [inputValue, setInputValue] = useState('');
     
     const addTag = (tag: string) => {
       if (tags.length < maxTags && !tags.includes(tag)) {
         onChange([...tags, tag]);
       }
     };
     
     const removeTag = (tagToRemove: string) => {
       onChange(tags.filter(tag => tag !== tagToRemove));
     };
   };
   ```

2. **History Service Update**:
   ```javascript
   // controllers/scenarioController.js
   async updateScenario(req, res) {
     const { scenarioId } = req.params;
     const { tags, isFavorite, rating } = req.body;
     
     const scenario = await Scenario.findOne({
       scenarioId,
       userId: req.user.id,
       isDeleted: false
     });
     
     if (tags) {
       // Validate tags
       const validTags = tags
         .filter(tag => tag.trim().length > 0 && tag.length <= 30)
         .slice(0, 10); // Max 10 tags
       
       scenario.tags = validTags;
     }
     
     await scenario.save();
   }
   ```

3. **Tag Analytics**:
   ```javascript
   // Get popular tags for user
   async getPopularTags(userId) {
     return await Scenario.aggregate([
       { $match: { userId, isDeleted: false } },
       { $unwind: '$tags' },
       { $group: { _id: '$tags', count: { $sum: 1 } } },
       { $sort: { count: -1 } },
       { $limit: 10 }
     ]);
   }
   ```

---

## UC-008: Tìm kiếm viễn cảnh

### Search Implementation

1. **Frontend Search Interface**:
   ```typescript
   // components/SearchBar.tsx
   const SearchBar = ({ onSearch, filters, onFilterChange }) => {
     const [query, setQuery] = useState('');
     const [activeFilters, setActiveFilters] = useState(filters);
     
     const handleSearch = () => {
       onSearch({
         q: query,
         tags: activeFilters.tags?.join(','),
         promptType: activeFilters.promptType,
         isFavorite: activeFilters.isFavorite
       });
     };
   };
   ```

2. **MongoDB Text Search**:
   ```javascript
   // models/Scenario.js
   scenarioSchema.index({ 
     topic: 'text', 
     content: 'text', 
     tags: 'text' 
   });
   
   // Search implementation
   scenarioSchema.statics.searchByUser = function(userId, searchTerm, options) {
     const query = {
       userId,
       isDeleted: false,
       $or: [
         { topic: { $regex: searchTerm, $options: 'i' } },
         { content: { $regex: searchTerm, $options: 'i' } },
         { tags: { $in: [new RegExp(searchTerm, 'i')] } }
       ]
     };
     
     return this.find(query)
       .sort(options.sort || { createdAt: -1 })
       .limit(options.limit || 20)
       .skip(options.skip || 0);
   };
   ```

3. **Advanced Filtering**:
   ```javascript
   // History Service search controller
   async searchScenarios(req, res) {
     const {
       q, tags, promptType, isFavorite, 
       dateFrom, dateTo, page, limit
     } = req.query;
     
     let scenarios, total;
     
     if (q) {
       // Text search
       [scenarios, total] = await Promise.all([
         Scenario.searchByUser(userId, q, options),
         Scenario.countDocuments(textSearchQuery)
       ]);
     } else {
       // Filter-based search
       const filter = { isDeleted: false };
       if (promptType) filter.promptType = promptType;
       if (isFavorite !== undefined) filter.isFavorite = isFavorite;
       if (tags) filter.tags = { $in: tags.split(',') };
       if (dateFrom || dateTo) {
         filter.createdAt = {};
         if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
         if (dateTo) filter.createdAt.$lte = new Date(dateTo);
       }
       
       [scenarios, total] = await Promise.all([
         Scenario.findByUserId(userId, { filter, ...options }),
         Scenario.countDocuments({ userId, ...filter })
       ]);
     }
   }
   ```

---

## UC-009: Xóa viễn cảnh

### Soft Delete Implementation

1. **Frontend Confirmation**:
   ```typescript
   // components/DeleteConfirmation.tsx
   const DeleteConfirmation = ({ scenario, onConfirm, onCancel }) => {
     return (
       <Modal>
         <h3>Xác nhận xóa</h3>
         <p>Bạn có chắc muốn xóa viễn cảnh "{scenario.topic}"?</p>
         <p>Hành động này không thể hoàn tác.</p>
         <Button onClick={onConfirm} variant="danger">Xóa</Button>
         <Button onClick={onCancel} variant="outline">Hủy</Button>
       </Modal>
     );
   };
   ```

2. **History Service Soft Delete**:
   ```javascript
   // controllers/scenarioController.js
   async deleteScenario(req, res) {
     const { scenarioId } = req.params;
     const userId = req.user.id;
     
     const scenario = await Scenario.findOne({
       scenarioId,
       userId,
       isDeleted: false
     });
     
     if (!scenario) {
       return res.status(404).json({
         success: false,
         message: 'Scenario not found'
       });
     }
     
     // Soft delete
     scenario.isDeleted = true;
     scenario.deletedAt = new Date();
     scenario.isPublic = false; // Remove from public if shared
     await scenario.save();
     
     // Also deactivate any shares
     await SharedScenario.updateMany(
       { scenarioId },
       { isActive: false }
     );
   }
   ```

3. **Cleanup Job**:
   ```javascript
   // Periodic cleanup of old deleted scenarios
   const cleanupDeletedScenarios = async () => {
     const retentionDays = process.env.SCENARIO_RETENTION_DAYS || 365;
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
     
     const result = await Scenario.deleteMany({
       isDeleted: true,
       deletedAt: { $lt: cutoffDate }
     });
     
     logger.info(`Cleaned up ${result.deletedCount} old deleted scenarios`);
   };
   ```

---

## UC-010: Xem viễn cảnh ngẫu nhiên

### Random Content Implementation

1. **Generation Service Random**:
   ```javascript
   // services/aiService.js
   async generateRandomScenario() {
     const randomTopics = [
       'Nếu như con người có thể bay',
       'Nếu như động vật có thể nói chuyện',
       'Nếu như thời gian có thể dừng lại',
       // ... more topics
     ];
     
     const randomTopic = randomTopics[
       Math.floor(Math.random() * randomTopics.length)
     ];
     
     return await this.generateScenario(randomTopic, { forceNew: true });
   }
   ```

2. **History Service Random Public**:
   ```javascript
   // controllers/scenarioController.js
   async getRandomPublicScenarios(req, res) {
     const { limit = 10 } = req.query;
     
     const scenarios = await Scenario.aggregate([
       { $match: { isPublic: true, isDeleted: false } },
       { $sample: { size: parseInt(limit) } },
       { $project: { userId: 0 } } // Hide user IDs for privacy
     ]);
     
     res.json({ success: true, data: { scenarios } });
   }
   ```

---

## UC-011: Báo cáo viễn cảnh không phù hợp

### Moderation System Implementation

1. **Report Creation**:
   ```javascript
   // sharing-service/services/reportingService.js
   async createReport(reportData) {
     // Check for duplicate reports
     const existingReport = await Report.checkDuplicateReport(
       reportData.targetType,
       reportData.targetId,
       reportData.reporterId,
       reportData.reporterIP
     );
     
     if (existingReport) {
       return { isDuplicate: true, existingReport };
     }
     
     const report = new Report(reportData);
     
     // Auto-moderation
     if (process.env.AUTO_MODERATE_REPORTS === 'true') {
       await this.performAutoModeration(report);
     }
     
     await report.save();
     
     // Check action threshold
     await this.checkActionThreshold(
       reportData.targetType, 
       reportData.targetId
     );
   }
   ```

2. **Auto-Moderation**:
   ```javascript
   async performAutoModeration(report) {
     let autoModerationScore = 0;
     
     // Check for high-priority reasons
     const highPriorityReasons = ['violence', 'hate_speech', 'harassment'];
     if (highPriorityReasons.includes(report.reason)) {
       autoModerationScore += 0.6;
     }
     
     // Check for critical severity
     if (report.severity === 'critical') {
       autoModerationScore += 0.5;
     }
     
     report.autoModerationScore = autoModerationScore;
     
     // Auto-escalate high-scoring reports
     if (autoModerationScore >= 0.8) {
       report.status = 'escalated';
       await this.notifyAdmin(report);
     }
   }
   ```

3. **Action Threshold**:
   ```javascript
   async checkActionThreshold(targetType, targetId) {
     const threshold = parseInt(process.env.REPORT_THRESHOLD_FOR_HIDE) || 5;
     
     const reportCount = await Report.countDocuments({
       targetType,
       targetId,
       status: { $ne: 'dismissed' }
     });
     
     if (reportCount >= threshold) {
       // Auto-hide content
       await this.hideSharedScenario(targetId, 'Auto-hidden due to reports');
     }
   }
   ```

---

## UC-012: Sao chép nội dung

### Copy-to-Clipboard Implementation

1. **Frontend Copy Function**:
   ```typescript
   // utils/clipboard.ts
   export const copyToClipboard = async (text: string): Promise<boolean> => {
     try {
       if (navigator.clipboard && window.isSecureContext) {
         await navigator.clipboard.writeText(text);
         return true;
       } else {
         // Fallback for older browsers
         const textArea = document.createElement('textarea');
         textArea.value = text;
         textArea.style.position = 'fixed';
         textArea.style.left = '-999999px';
         textArea.style.top = '-999999px';
         document.body.appendChild(textArea);
         textArea.focus();
         textArea.select();
         
         const result = document.execCommand('copy');
         textArea.remove();
         return result;
       }
     } catch (error) {
       console.error('Copy failed:', error);
       return false;
     }
   };
   ```

2. **Component Implementation**:
   ```typescript
   // components/CopyButton.tsx
   const CopyButton = ({ text, label = "Sao chép" }) => {
     const [copied, setCopied] = useState(false);
     
     const handleCopy = async () => {
       const success = await copyToClipboard(text);
       
       if (success) {
         setCopied(true);
         toast.success('Đã sao chép thành công!');
         setTimeout(() => setCopied(false), 2000);
       } else {
         toast.error('Lỗi sao chép, vui lòng thử lại');
       }
     };
     
     return (
       <Button onClick={handleCopy} disabled={copied}>
         {copied ? 'Đã sao chép!' : label}
       </Button>
     );
   };
   ```

---

## UC-013 & UC-014: Đổi mật khẩu & Email

### Account Management Implementation

1. **Change Password**:
   ```javascript
   // user-service/controllers/userController.js
   async changePassword(req, res) {
     const user = req.user;
     const { currentPassword, newPassword } = req.body;
     
     // Verify current password
     const isValid = await user.comparePassword(currentPassword);
     if (!isValid) {
       return res.status(400).json({
         success: false,
         message: 'Mật khẩu hiện tại không chính xác'
       });
     }
     
     // Check new password is different
     const isSame = await user.comparePassword(newPassword);
     if (isSame) {
       return res.status(400).json({
         success: false,
         message: 'Mật khẩu mới phải khác mật khẩu hiện tại'
       });
     }
     
     await user.update({ password: newPassword });
     
     res.json({
       success: true,
       message: 'Đổi mật khẩu thành công'
     });
   }
   ```

2. **Change Email**:
   ```javascript
   async changeEmail(req, res) {
     const { newEmail, password } = req.body;
     
     // Verify password
     const isPasswordValid = await user.comparePassword(password);
     if (!isPasswordValid) {
       return res.status(400).json({
         success: false,
         message: 'Mật khẩu không chính xác'
       });
     }
     
     // Check email availability
     const existingUser = await User.findOne({ 
       where: { 
         email: newEmail,
         id: { [Op.ne]: user.id }
       } 
     });
     
     if (existingUser) {
       return res.status(409).json({
         success: false,
         message: 'Email này đã được sử dụng'
       });
     }
     
     // Update email và reset verification
     await user.update({
       email: newEmail,
       emailVerified: false,
       emailVerificationToken: crypto.randomBytes(32).toString('hex')
     });
   }
   ```

---

## UC-015: Xóa tài khoản

### GDPR-Compliant Account Deletion

1. **Account Deletion Process**:
   ```javascript
   // user-service/controllers/userController.js
   async deleteAccount(req, res) {
     const user = req.user;
     const { password } = req.body;
     
     // Verify password
     const isPasswordValid = await user.comparePassword(password);
     if (!isPasswordValid) {
       return res.status(400).json({
         success: false,
         message: 'Mật khẩu không chính xác'
       });
     }
     
     // Soft delete - anonymize data
     await user.update({ 
       isActive: false,
       email: `deleted_${Date.now()}_${user.email}`,
       firstName: null,
       lastName: null,
       password: null,
       emailVerificationToken: null,
       passwordResetToken: null
     });
     
     // Notify other services
     await this.notifyServicesOfUserDeletion(user.id);
   }
   ```

2. **Cross-Service Data Cleanup**:
   ```javascript
   async notifyServicesOfUserDeletion(userId) {
     try {
       // Anonymize scenarios in history service
       await axios.patch(`${process.env.HISTORY_SERVICE_URL}/users/${userId}/anonymize`);
       
       // Deactivate shares in sharing service
       await axios.patch(`${process.env.SHARING_SERVICE_URL}/users/${userId}/deactivate`);
       
     } catch (error) {
       logger.error('Error notifying services of user deletion', { userId, error });
     }
   }
   ```

---

## UC-016: Thay đổi cài đặt giao diện

### User Preferences Implementation

1. **Frontend Theme Context**:
   ```typescript
   // contexts/ThemeContext.tsx
   const ThemeContext = createContext<{
     theme: 'light' | 'dark';
     language: 'vi' | 'en';
     toggleTheme: () => void;
     changeLanguage: (lang: 'vi' | 'en') => void;
   }>();
   
   export const ThemeProvider = ({ children }) => {
     const [theme, setTheme] = useState<'light' | 'dark'>('light');
     const [language, setLanguage] = useState<'vi' | 'en'>('vi');
     
     // Load from user preferences
     useEffect(() => {
       if (user?.preferences) {
         setTheme(user.preferences.theme);
         setLanguage(user.preferences.language);
       }
     }, [user]);
     
     const toggleTheme = () => {
       const newTheme = theme === 'light' ? 'dark' : 'light';
       setTheme(newTheme);
       updateUserPreferences({ theme: newTheme });
     };
   };
   ```

2. **Preferences Storage**:
   ```javascript
   // user-service/controllers/userController.js
   async updateProfile(req, res) {
     const { preferences } = req.body;
     
     if (preferences) {
       // Validate preferences
       const validPreferences = {
         theme: ['light', 'dark'].includes(preferences.theme) 
           ? preferences.theme : user.preferences.theme,
         language: ['vi', 'en'].includes(preferences.language)
           ? preferences.language : user.preferences.language,
         notifications: typeof preferences.notifications === 'boolean'
           ? preferences.notifications : user.preferences.notifications
       };
       
       await user.update({
         preferences: { ...user.preferences, ...validPreferences }
       });
     }
   }
   ```

3. **Real-time UI Updates**:
   ```typescript
   // hooks/useTheme.ts
   const useTheme = () => {
     const { theme, language } = useContext(ThemeContext);
     
     useEffect(() => {
       // Apply theme to document
       document.documentElement.setAttribute('data-theme', theme);
       document.documentElement.setAttribute('lang', language);
       
       // Update CSS custom properties
       const root = document.documentElement;
       if (theme === 'dark') {
         root.style.setProperty('--bg-primary', '#1a1a1a');
         root.style.setProperty('--text-primary', '#ffffff');
       } else {
         root.style.setProperty('--bg-primary', '#ffffff');
         root.style.setProperty('--text-primary', '#000000');
       }
     }, [theme, language]);
   };
   ```

---

## Error Handling Strategy

### 1. Service-Level Error Handling
```javascript
// Standard error response format
const errorResponse = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: details,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
};
```

### 2. API Gateway Error Aggregation
```javascript
// Aggregate errors from multiple services
app.use((error, req, res, next) => {
  logger.error('Global error handler', {
    error: error.message,
    service: error.service,
    requestId: req.requestId,
    userId: req.user?.id
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    requestId: req.requestId,
    ...(isDevelopment && { stack: error.stack })
  });
});
```

### 3. Frontend Error Boundaries
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error('React Error Boundary', { error, errorInfo });
    
    // Show user-friendly error message
    toast.error('Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang.');
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => window.location.reload()} />;
    }
    
    return this.props.children;
  }
}
```

## Kết Luận

Implementation này đảm bảo:
- ✅ **Đầy đủ Use Cases**: Tất cả 16 use cases được implement
- ✅ **Scalable Architecture**: Microservices độc lập
- ✅ **Security**: JWT auth, rate limiting, input validation
- ✅ **Performance**: Caching, optimization, async processing
- ✅ **Reliability**: Error handling, health checks, monitoring
- ✅ **Maintainability**: Clean code, documentation, testing

Hệ thống sẵn sàng cho production với khả năng mở rộng và maintain dài hạn.