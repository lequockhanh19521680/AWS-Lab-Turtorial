const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      theme: 'light',
      language: 'vi',
      notifications: true
    }
  },
  // OAuth fields
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'local' // 'local', 'google', 'facebook'
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Social media fields
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [3, 30],
      is: /^[a-zA-Z0-9_]+$/
    }
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 50]
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  // Social stats
  followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  following: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  reputation: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 100
    }
  },
  experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    },
    {
      unique: true,
      fields: ['google_id']
    },
    {
      unique: true,
      fields: ['facebook_id']
    },
    {
      fields: ['email_verification_token']
    },
    {
      fields: ['password_reset_token']
    },
    {
      fields: ['reputation']
    },
    {
      fields: ['level']
    }
  ]
});

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

User.prototype.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockUntil: null
    });
  }

  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }

  return this.update(updates);
};

User.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockUntil: null
  });
};

// Static methods
User.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

User.findByGoogleId = function(googleId) {
  return this.findOne({ where: { googleId } });
};

User.findByFacebookId = function(facebookId) {
  return this.findOne({ where: { facebookId } });
};

User.findTopUsers = function(limit = 50) {
  return this.findAll({
    where: { isPublic: true },
    order: [['reputation', 'DESC']],
    limit
  });
};

User.findByProvider = function(provider) {
  return this.findAll({ where: { provider } });
};

// Instance methods
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.passwordResetToken;
  delete values.emailVerificationToken;
  return values;
};

User.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    avatar: this.avatar,
    location: this.location,
    website: this.website,
    followers: this.followers,
    following: this.following,
    reputation: this.reputation,
    level: this.level,
    isVerified: this.isVerified,
    isPublic: this.isPublic,
    createdAt: this.createdAt
  };
};

User.prototype.incrementExperience = async function(points) {
  this.experience += points;
  
  // Update level based on experience
  const newLevel = Math.floor(this.experience / 1000) + 1;
  if (newLevel > this.level && newLevel <= 100) {
    this.level = newLevel;
  }
  
  return this.save();
};

User.prototype.incrementReputation = async function(points) {
  this.reputation += points;
  return this.save();
};

User.prototype.updateSocialStats = async function(stats) {
  const allowedStats = ['followers', 'following', 'reputation', 'experience'];
  
  for (const [key, value] of Object.entries(stats)) {
    if (allowedStats.includes(key) && typeof value === 'number') {
      this[key] += value;
    }
  }
  
  // Update level based on experience
  if (stats.experience) {
    const newLevel = Math.floor(this.experience / 1000) + 1;
    if (newLevel > this.level && newLevel <= 100) {
      this.level = newLevel;
    }
  }
  
  return this.save();
};

module.exports = User;