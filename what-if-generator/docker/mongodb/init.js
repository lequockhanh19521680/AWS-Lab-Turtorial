// MongoDB initialization script
// This script sets up databases and collections for History and Sharing services

// Function to log initialization steps
function log(message) {
    print(`[MongoDB Init] ${new Date().toISOString()}: ${message}`);
}

log('Starting MongoDB initialization...');

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create application user (if not exists)
try {
    db.createUser({
        user: 'what_if_app',
        pwd: 'app_password_123',
        roles: [
            { role: 'readWrite', db: 'what_if_history' },
            { role: 'readWrite', db: 'what_if_sharing' }
        ]
    });
    log('Application user created successfully');
} catch (e) {
    if (e.code !== 11000) { // Ignore duplicate user error
        log('Error creating application user: ' + e.message);
    } else {
        log('Application user already exists');
    }
}

// ========================================
// HISTORY SERVICE DATABASE SETUP
// ========================================

log('Setting up History Service database...');
db = db.getSiblingDB('what_if_history');

// Create scenarios collection
db.createCollection('scenarios');
log('Created scenarios collection');

// Create indexes for scenarios collection
db.scenarios.createIndex({ "scenarioId": 1 }, { unique: true });
db.scenarios.createIndex({ "userId": 1, "createdAt": -1 });
db.scenarios.createIndex({ "userId": 1, "isDeleted": 1, "createdAt": -1 });
db.scenarios.createIndex({ "tags": 1 });
db.scenarios.createIndex({ "isPublic": 1, "createdAt": -1 });
db.scenarios.createIndex({ "topic": "text", "content": "text", "tags": "text" });

// Compound indexes for common queries
db.scenarios.createIndex({ "userId": 1, "isFavorite": 1, "isDeleted": 1 });
db.scenarios.createIndex({ "userId": 1, "promptType": 1, "isDeleted": 1 });
db.scenarios.createIndex({ "promptType": 1, "isPublic": 1, "createdAt": -1 });

log('Created indexes for scenarios collection');

// Create scenario analytics collection
db.createCollection('scenario_analytics');

// Create indexes for analytics
db.scenario_analytics.createIndex({ "scenarioId": 1, "date": -1 });
db.scenario_analytics.createIndex({ "userId": 1, "date": -1 });
db.scenario_analytics.createIndex({ "date": -1 });

log('Created scenario_analytics collection with indexes');

// Insert sample data for testing (optional)
if (db.scenarios.countDocuments() === 0) {
    const sampleScenarios = [
        {
            scenarioId: "sample_scenario_1",
            userId: "sample_user_123",
            topic: "Nếu như con người có thể bay",
            content: "Trong một thế giới mà con người có thể bay, giao thông sẽ hoàn toàn thay đổi. Không còn tắc đường, tai nạn giao thông giảm đáng kể. Tuy nhiên, sẽ cần có luật lệ mới cho giao thông hàng không cá nhân...",
            promptType: "fantasy",
            provider: "gemini",
            model: "gemini-pro",
            tokens: { prompt: 50, completion: 200, total: 250 },
            tags: ["thú vị", "khoa học viễn tưởng"],
            isPublic: true,
            shareUrl: null,
            isFavorite: false,
            rating: null,
            viewCount: 0,
            shareCount: 0,
            generatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false
        },
        {
            scenarioId: "sample_scenario_2",
            userId: "sample_user_456",
            topic: "Nếu như Internet không bao giờ được phát minh",
            content: "Thế giới không có Internet sẽ rất khác biệt. Thông tin vẫn được chia sẻ qua báo chí, đài phát thanh và truyền hình. Thương mại điện tử không tồn tại, mọi giao dịch đều diễn ra trực tiếp...",
            promptType: "historical",
            provider: "gemini",
            model: "gemini-pro",
            tokens: { prompt: 60, completion: 180, total: 240 },
            tags: ["lịch sử", "công nghệ"],
            isPublic: true,
            shareUrl: null,
            isFavorite: true,
            rating: 5,
            viewCount: 15,
            shareCount: 3,
            generatedAt: new Date(Date.now() - 86400000), // 1 day ago
            createdAt: new Date(Date.now() - 86400000),
            updatedAt: new Date(Date.now() - 86400000),
            isDeleted: false
        }
    ];
    
    db.scenarios.insertMany(sampleScenarios);
    log(`Inserted ${sampleScenarios.length} sample scenarios`);
}

// ========================================
// SHARING SERVICE DATABASE SETUP
// ========================================

log('Setting up Sharing Service database...');
db = db.getSiblingDB('what_if_sharing');

// Create shared_scenarios collection
db.createCollection('shared_scenarios');
log('Created shared_scenarios collection');

// Create indexes for shared_scenarios collection
db.shared_scenarios.createIndex({ "shareUrl": 1 }, { unique: true });
db.shared_scenarios.createIndex({ "shortUrl": 1 }, { unique: true, sparse: true });
db.shared_scenarios.createIndex({ "scenarioId": 1 });
db.shared_scenarios.createIndex({ "userId": 1, "createdAt": -1 });
db.shared_scenarios.createIndex({ "isActive": 1, "isHidden": 1 });
db.shared_scenarios.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

log('Created indexes for shared_scenarios collection');

// Create reports collection
db.createCollection('reports');
log('Created reports collection');

// Create indexes for reports collection
db.reports.createIndex({ "targetId": 1, "status": 1 });
db.reports.createIndex({ "scenarioId": 1 });
db.reports.createIndex({ "reporterId": 1, "createdAt": -1 });
db.reports.createIndex({ "status": 1, "createdAt": -1 });
db.reports.createIndex({ "severity": 1, "status": 1 });
db.reports.createIndex({ "isAutoModerated": 1, "status": 1 });
db.reports.createIndex({ "followUpRequired": 1, "followUpDate": 1 });

// Compound indexes for reports
db.reports.createIndex({ "targetType": 1, "targetId": 1, "reporterId": 1 });
db.reports.createIndex({ "reason": 1, "status": 1, "createdAt": -1 });
db.reports.createIndex({ "priorityScore": -1, "createdAt": 1 });

log('Created indexes for reports collection');

// Insert sample shared scenarios for testing
if (db.shared_scenarios.countDocuments() === 0) {
    const sampleShares = [
        {
            scenarioId: "sample_scenario_1",
            userId: "sample_user_123",
            shareUrl: "abc123-def456-ghi789",
            shortUrl: null,
            scenarioData: {
                topic: "Nếu như con người có thể bay",
                content: "Trong một thế giới mà con người có thể bay...",
                promptType: "fantasy",
                tags: ["thú vị", "khoa học viễn tưởng"],
                generatedAt: new Date()
            },
            isActive: true,
            isPasswordProtected: false,
            password: null,
            expiresAt: null,
            title: null,
            description: null,
            previewImage: null,
            viewCount: 5,
            shareCount: 2,
            sharesByPlatform: {
                facebook: 1,
                twitter: 0,
                linkedin: 0,
                whatsapp: 1,
                telegram: 0,
                email: 0,
                copy: 0,
                qr: 0,
                other: 0
            },
            viewsByCountry: new Map([
                ["VN", 3],
                ["US", 2]
            ]),
            viewsByDevice: {
                desktop: 2,
                mobile: 3,
                tablet: 0
            },
            referrers: new Map([
                ["https://google.com", 2],
                ["direct", 3]
            ]),
            firstAccessAt: new Date(Date.now() - 3600000), // 1 hour ago
            lastAccessAt: new Date(),
            reportCount: 0,
            isReported: false,
            isHidden: false,
            hiddenAt: null,
            hiddenReason: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    
    db.shared_scenarios.insertMany(sampleShares);
    log(`Inserted ${sampleShares.length} sample shared scenarios`);
}

// Insert sample reports for testing
if (db.reports.countDocuments() === 0) {
    const sampleReports = [
        {
            targetType: "shared_scenario",
            targetId: "abc123-def456-ghi789",
            shareUrl: "abc123-def456-ghi789",
            scenarioId: "sample_scenario_1",
            reporterId: null, // anonymous report
            reporterIP: "192.168.1.100",
            reporterUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            reason: "inappropriate_content",
            description: "Nội dung không phù hợp với trẻ em",
            category: "content",
            severity: "medium",
            status: "pending",
            reviewedBy: null,
            reviewedAt: null,
            moderatorNotes: null,
            actionTaken: "none",
            actionReason: null,
            isAutoModerated: false,
            autoModerationScore: null,
            isDuplicate: false,
            originalReportId: null,
            priorityScore: 50,
            resolvedAt: null,
            resolution: null,
            followUpRequired: false,
            followUpDate: null,
            reporterNotified: false,
            reporterSatisfied: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    
    db.reports.insertMany(sampleReports);
    log(`Inserted ${sampleReports.length} sample reports`);
}

// ========================================
// UTILITY FUNCTIONS AND VALIDATION
// ========================================

// Create validation rules for scenarios
db.runCommand({
    collMod: "scenarios",
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["scenarioId", "userId", "topic", "content", "generatedAt"],
            properties: {
                scenarioId: {
                    bsonType: "string",
                    description: "Unique scenario identifier - required"
                },
                userId: {
                    bsonType: "string",
                    description: "User ID who created the scenario - required"
                },
                topic: {
                    bsonType: "string",
                    maxLength: 200,
                    description: "Scenario topic - required, max 200 chars"
                },
                content: {
                    bsonType: "string",
                    maxLength: 5000,
                    description: "Scenario content - required, max 5000 chars"
                },
                promptType: {
                    enum: ["default", "historical", "scientific", "social", "fantasy"],
                    description: "Type of prompt used"
                },
                tags: {
                    bsonType: "array",
                    maxItems: 10,
                    items: {
                        bsonType: "string",
                        maxLength: 30
                    },
                    description: "Scenario tags - max 10 items, each max 30 chars"
                },
                rating: {
                    bsonType: ["int", "null"],
                    minimum: 1,
                    maximum: 5,
                    description: "Scenario rating - 1 to 5 or null"
                },
                isDeleted: {
                    bsonType: "bool",
                    description: "Soft delete flag"
                }
            }
        }
    }
});

log('Added validation rules for scenarios collection');

// Create validation rules for reports
db.runCommand({
    collMod: "reports",
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["targetType", "targetId", "scenarioId", "reporterIP", "reason"],
            properties: {
                targetType: {
                    enum: ["scenario", "shared_scenario"],
                    description: "Type of target being reported"
                },
                reason: {
                    enum: [
                        "inappropriate_content", "spam", "harassment", "violence", 
                        "hate_speech", "adult_content", "misinformation", 
                        "copyright_violation", "other"
                    ],
                    description: "Reason for the report"
                },
                category: {
                    enum: ["content", "behavior", "technical", "legal"],
                    description: "Category of the report"
                },
                severity: {
                    enum: ["low", "medium", "high", "critical"],
                    description: "Severity level of the report"
                },
                status: {
                    enum: ["pending", "under_review", "resolved", "dismissed", "escalated"],
                    description: "Current status of the report"
                },
                description: {
                    bsonType: ["string", "null"],
                    maxLength: 500,
                    description: "Report description - max 500 chars"
                }
            }
        }
    }
});

log('Added validation rules for reports collection');

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================

// Set up capped collection for logs (optional)
try {
    db.createCollection("system_logs", {
        capped: true,
        size: 50000000, // 50MB
        max: 100000     // 100k documents
    });
    log('Created capped collection for system logs');
} catch (e) {
    log('System logs collection already exists or error: ' + e.message);
}

// ========================================
// FINAL SETUP AND VERIFICATION
// ========================================

// Verify database setup
const historyDb = db.getSiblingDB('what_if_history');
const sharingDb = db.getSiblingDB('what_if_sharing');

log('=== Database Setup Verification ===');
log(`History database collections: ${historyDb.getCollectionNames().join(', ')}`);
log(`Sharing database collections: ${sharingDb.getCollectionNames().join(', ')}`);

log(`Scenarios count: ${historyDb.scenarios.countDocuments()}`);
log(`Shared scenarios count: ${sharingDb.shared_scenarios.countDocuments()}`);
log(`Reports count: ${sharingDb.reports.countDocuments()}`);

// Create database-level users if needed
try {
    historyDb.createUser({
        user: 'history_service',
        pwd: 'history_pass_123',
        roles: [{ role: 'readWrite', db: 'what_if_history' }]
    });
    log('Created history service user');
} catch (e) {
    if (e.code !== 11000) {
        log('Error creating history service user: ' + e.message);
    }
}

try {
    sharingDb.createUser({
        user: 'sharing_service',
        pwd: 'sharing_pass_123',
        roles: [{ role: 'readWrite', db: 'what_if_sharing' }]
    });
    log('Created sharing service user');
} catch (e) {
    if (e.code !== 11000) {
        log('Error creating sharing service user: ' + e.message);
    }
}

log('=== MongoDB Initialization Completed Successfully! ===');
log('');
log('Database Setup Summary:');
log('- History Service: what_if_history');
log('  * scenarios collection with indexes and validation');
log('  * scenario_analytics collection');
log('- Sharing Service: what_if_sharing');
log('  * shared_scenarios collection with indexes and validation');
log('  * reports collection with indexes and validation');
log('');
log('Default credentials (change in production):');
log('- Application user: what_if_app / app_password_123');
log('- History service: history_service / history_pass_123');
log('- Sharing service: sharing_service / sharing_pass_123');
log('');
// ========================================
// SOCIAL MEDIA SERVICE DATABASE SETUP
// ========================================

log('Setting up Social Media Service database...');
db = db.getSiblingDB('what_if_social');

// Create collections
db.createCollection('achievements');
db.createCollection('userachievements');
db.createCollection('posts');
db.createCollection('comments');
db.createCollection('userprofiles');
log('Created social media collections');

// Create indexes for achievements collection
db.achievements.createIndex({ "achievementId": 1 }, { unique: true });
db.achievements.createIndex({ "category": 1 });
db.achievements.createIndex({ "rarity": 1 });
db.achievements.createIndex({ "isActive": 1 });
db.achievements.createIndex({ "isHidden": 1 });

// Create indexes for userachievements collection
db.userachievements.createIndex({ "userAchievementId": 1 }, { unique: true });
db.userachievements.createIndex({ "userId": 1 });
db.userachievements.createIndex({ "achievementId": 1 });
db.userachievements.createIndex({ "userId": 1, "achievementId": 1 }, { unique: true });
db.userachievements.createIndex({ "userId": 1, "isCompleted": 1 });
db.userachievements.createIndex({ "unlockedAt": -1 });

// Create indexes for posts collection
db.posts.createIndex({ "postId": 1 }, { unique: true });
db.posts.createIndex({ "userId": 1 });
db.posts.createIndex({ "userId": 1, "isDeleted": 1, "createdAt": -1 });
db.posts.createIndex({ "visibility": 1, "isDeleted": 1, "createdAt": -1 });
db.posts.createIndex({ "tags": 1, "isDeleted": 1, "createdAt": -1 });
db.posts.createIndex({ "likes.count": -1, "createdAt": -1 });
db.posts.createIndex({ "shares.count": -1, "createdAt": -1 });
db.posts.createIndex({ "type": 1, "isDeleted": 1 });
db.posts.createIndex({ "scenarioId": 1 });

// Create indexes for comments collection
db.comments.createIndex({ "commentId": 1 }, { unique: true });
db.comments.createIndex({ "postId": 1, "isDeleted": 1, "createdAt": -1 });
db.comments.createIndex({ "userId": 1, "isDeleted": 1, "createdAt": -1 });
db.comments.createIndex({ "parentCommentId": 1, "isDeleted": 1, "createdAt": -1 });

// Create indexes for userprofiles collection
db.userprofiles.createIndex({ "userId": 1 }, { unique: true });
db.userprofiles.createIndex({ "username": 1 }, { unique: true });
db.userprofiles.createIndex({ "stats.followers": -1 });
db.userprofiles.createIndex({ "stats.reputation": -1 });
db.userprofiles.createIndex({ "stats.level": -1 });
db.userprofiles.createIndex({ "lastActiveAt": -1 });
db.userprofiles.createIndex({ "isBanned": 1 });

log('Created indexes for social media collections');

// Insert default achievements
db.achievements.insertMany([
  {
    "achievementId": "first_scenario",
    "name": "First Steps",
    "description": "Tạo viễn cảnh đầu tiên của bạn",
    "category": "creation",
    "icon": "🌟",
    "badge": "first-steps",
    "points": 10,
    "rarity": "common",
    "requirements": {
      "type": "scenario_created",
      "count": 1
    },
    "isActive": true,
    "isHidden": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "achievementId": "scenario_master",
    "name": "Master Creator",
    "description": "Tạo 100 viễn cảnh",
    "category": "creation",
    "icon": "🎭",
    "badge": "master-creator",
    "points": 100,
    "rarity": "rare",
    "requirements": {
      "type": "scenario_created",
      "count": 100
    },
    "isActive": true,
    "isHidden": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "achievementId": "social_butterfly",
    "name": "Social Butterfly",
    "description": "Nhận được 100 lượt like",
    "category": "social",
    "icon": "🦋",
    "badge": "social-butterfly",
    "points": 75,
    "rarity": "uncommon",
    "requirements": {
      "type": "likes_received",
      "count": 100
    },
    "isActive": true,
    "isHidden": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "achievementId": "influencer",
    "name": "Influencer",
    "description": "Có 1000 follower",
    "category": "social",
    "icon": "👑",
    "badge": "influencer",
    "points": 200,
    "rarity": "epic",
    "requirements": {
      "type": "followers",
      "count": 1000
    },
    "isActive": true,
    "isHidden": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "achievementId": "legend",
    "name": "Legend",
    "description": "Đạt level 50",
    "category": "milestone",
    "icon": "🏆",
    "badge": "legend",
    "points": 500,
    "rarity": "legendary",
    "requirements": {
      "type": "level",
      "count": 50
    },
    "isActive": true,
    "isHidden": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  }
]);

log('Inserted default achievements');

// Create social service user
try {
    db.createUser({
        user: 'social_service',
        pwd: 'social_pass_123',
        roles: [{ role: 'readWrite', db: 'what_if_social' }]
    });
    log('Created social service user');
} catch (e) {
    if (e.code !== 11000) {
        log('Error creating social service user: ' + e.message);
    }
}

log('Sample data has been inserted for testing purposes.');
log('Remember to change default passwords in production!');
log('');
log('Social Media database: what_if_social');
log('- achievements, userachievements, posts, comments, userprofiles collections');
log('- Default achievements inserted');