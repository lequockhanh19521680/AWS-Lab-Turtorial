/**
 * Master Seed Data Configuration
 * This file contains all the seed data needed for the application
 */

const seedData = {
  // Admin users
  adminUsers: [
    {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@whatifgenerator.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
      first_name: 'Hệ thống',
      last_name: 'Quản trị',
      is_active: true,
      email_verified: true,
      roles: ['admin', 'user']
    }
  ],

  // Sample categories for scenarios
  categories: [
    {
      id: 'technology',
      name: 'Công nghệ',
      description: 'Các kịch bản liên quan đến công nghệ và đổi mới',
      icon: 'computer',
      color: '#3B82F6',
      sort_order: 1
    },
    {
      id: 'society',
      name: 'Xã hội',
      description: 'Các kịch bản về thay đổi xã hội và văn hóa',
      icon: 'users',
      color: '#10B981',
      sort_order: 2
    },
    {
      id: 'environment',
      name: 'Môi trường',
      description: 'Các kịch bản về môi trường và biến đổi khí hậu',
      icon: 'globe',
      color: '#059669',
      sort_order: 3
    },
    {
      id: 'economy',
      name: 'Kinh tế',
      description: 'Các kịch bản về kinh tế và tài chính',
      icon: 'chart-line',
      color: '#F59E0B',
      sort_order: 4
    },
    {
      id: 'health',
      name: 'Sức khỏe',
      description: 'Các kịch bản về y tế và sức khỏe cộng đồng',
      icon: 'heart',
      color: '#EF4444',
      sort_order: 5
    },
    {
      id: 'education',
      name: 'Giáo dục',
      description: 'Các kịch bản về giáo dục và đào tạo',
      icon: 'book-open',
      color: '#8B5CF6',
      sort_order: 6
    }
  ],

  // Sample scenario templates
  scenarioTemplates: [
    {
      title: 'Nếu như trí tuệ nhân tạo thay thế hoàn toàn giáo viên?',
      category: 'technology',
      description: 'Khám phá tác động của AI trong giáo dục',
      tags: ['AI', 'giáo dục', 'tương lai'],
      difficulty: 'medium',
      estimated_time: 15,
      is_featured: true
    },
    {
      title: 'Nếu như Việt Nam trở thành quốc gia carbon âm vào 2030?',
      category: 'environment',
      description: 'Phân tích kịch bản Việt Nam đạt carbon âm',
      tags: ['môi trường', 'carbon', 'bền vững'],
      difficulty: 'hard',
      estimated_time: 20,
      is_featured: true
    },
    {
      title: 'Nếu như tiền điện tử thay thế hoàn toàn tiền giấy?',
      category: 'economy',
      description: 'Tìm hiểu tác động của việc số hóa tiền tệ',
      tags: ['cryptocurrency', 'kinh tế', 'số hóa'],
      difficulty: 'medium',
      estimated_time: 18,
      is_featured: false
    }
  ],

  // Achievement definitions
  achievements: [
    {
      id: 'first_scenario',
      name: 'Người Khám Phá Đầu Tiên',
      description: 'Tạo kịch bản đầu tiên của bạn',
      icon: 'star',
      category: 'beginner',
      points: 10,
      requirement_type: 'scenario_count',
      requirement_value: 1,
      badge_color: '#10B981'
    },
    {
      id: 'scenario_creator',
      name: 'Nhà Sáng Tạo',
      description: 'Tạo 10 kịch bản',
      icon: 'lightbulb',
      category: 'creator',
      points: 50,
      requirement_type: 'scenario_count',
      requirement_value: 10,
      badge_color: '#F59E0B'
    },
    {
      id: 'social_sharer',
      name: 'Người Chia Sẻ',
      description: 'Chia sẻ 5 kịch bản',
      icon: 'share',
      category: 'social',
      points: 25,
      requirement_type: 'share_count',
      requirement_value: 5,
      badge_color: '#3B82F6'
    },
    {
      id: 'daily_user',
      name: 'Người Dùng Hàng Ngày',
      description: 'Sử dụng ứng dụng 7 ngày liên tiếp',
      icon: 'calendar',
      category: 'engagement',
      points: 30,
      requirement_type: 'consecutive_days',
      requirement_value: 7,
      badge_color: '#8B5CF6'
    },
    {
      id: 'expert_analyzer',
      name: 'Chuyên Gia Phân Tích',
      description: 'Tạo 50 kịch bản với độ khó cao',
      icon: 'brain',
      category: 'expert',
      points: 100,
      requirement_type: 'hard_scenario_count',
      requirement_value: 50,
      badge_color: '#EF4444'
    }
  ],

  // System settings
  systemSettings: [
    {
      key: 'app_name',
      value: 'Cỗ Máy Nếu Như',
      description: 'Tên ứng dụng',
      category: 'general'
    },
    {
      key: 'app_version',
      value: '2.0.0',
      description: 'Phiên bản ứng dụng',
      category: 'general'
    },
    {
      key: 'max_scenarios_per_day',
      value: '10',
      description: 'Số kịch bản tối đa mỗi ngày cho người dùng thường',
      category: 'limits'
    },
    {
      key: 'max_scenarios_per_day_premium',
      value: '50',
      description: 'Số kịch bản tối đa mỗi ngày cho người dùng premium',
      category: 'limits'
    },
    {
      key: 'scenario_generation_timeout',
      value: '30',
      description: 'Thời gian timeout cho việc tạo kịch bản (giây)',
      category: 'performance'
    },
    {
      key: 'enable_social_features',
      value: 'true',
      description: 'Bật tính năng xã hội',
      category: 'features'
    },
    {
      key: 'enable_video_generation',
      value: 'true',
      description: 'Bật tính năng tạo video',
      category: 'features'
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Chế độ bảo trì',
      category: 'system'
    }
  ],

  // Sample notification templates
  notificationTemplates: [
    {
      id: 'welcome',
      title: 'Chào mừng đến với Cỗ Máy Nếu Như!',
      content: 'Hãy bắt đầu tạo kịch bản đầu tiên của bạn.',
      type: 'welcome',
      is_active: true
    },
    {
      id: 'achievement_unlocked',
      title: 'Bạn đã mở khóa thành tích mới!',
      content: 'Chúc mừng bạn đã đạt được: {{achievement_name}}',
      type: 'achievement',
      is_active: true
    },
    {
      id: 'scenario_ready',
      title: 'Kịch bản của bạn đã sẵn sàng!',
      content: 'Kịch bản "{{scenario_title}}" đã được tạo thành công.',
      type: 'scenario',
      is_active: true
    }
  ]
};

module.exports = seedData;