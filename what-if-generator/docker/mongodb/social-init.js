// MongoDB initialization script for Social Media Service
// This script creates the database and collections for social media features

// Switch to the social database
db = db.getSiblingDB('what_if_social');

// Create collections
db.createCollection('achievements');
db.createCollection('userachievements');
db.createCollection('posts');
db.createCollection('comments');
db.createCollection('userprofiles');

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

print('Social Media database initialized successfully!');
print('Collections created: achievements, userachievements, posts, comments, userprofiles');
print('Indexes created for optimal performance');
print('Default achievements inserted');