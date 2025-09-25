import React from 'react';
import { Trophy, Star, Crown, Gem, Zap } from 'lucide-react';

interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: 'creation' | 'interaction' | 'social' | 'milestone' | 'special';
  icon: string;
  badge: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  progress?: number;
  isCompleted?: boolean;
  unlockedAt?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  showProgress?: boolean;
  className?: string;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  showProgress = false,
  className = ''
}) => {
  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          gradient: 'from-gray-400 to-gray-600'
        };
      case 'uncommon':
        return {
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          textColor: 'text-green-700',
          iconColor: 'text-green-500',
          gradient: 'from-green-400 to-green-600'
        };
      case 'rare':
        return {
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          gradient: 'from-blue-400 to-blue-600'
        };
      case 'epic':
        return {
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-300',
          textColor: 'text-purple-700',
          iconColor: 'text-purple-500',
          gradient: 'from-purple-400 to-purple-600'
        };
      case 'legendary':
        return {
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-300',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500',
          gradient: 'from-yellow-400 to-yellow-600'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          gradient: 'from-gray-400 to-gray-600'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'creation': return '🎨';
      case 'interaction': return '💬';
      case 'social': return '👥';
      case 'milestone': return '🎯';
      case 'special': return '✨';
      default: return '🏆';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Star className="w-4 h-4" />;
      case 'uncommon': return <Star className="w-4 h-4" />;
      case 'rare': return <Gem className="w-4 h-4" />;
      case 'epic': return <Crown className="w-4 h-4" />;
      case 'legendary': return <Zap className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const config = getRarityConfig(achievement.rarity);
  const isCompleted = achievement.isCompleted || achievement.progress === 100;

  return (
    <div className={`relative ${className}`}>
      <div className={`
        ${config.bgColor} ${config.borderColor}
        border-2 rounded-lg p-4 transition-all duration-300 hover:shadow-lg
        ${isCompleted ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Achievement Icon */}
            <div className={`
              w-12 h-12 rounded-full bg-gradient-to-r ${config.gradient}
              flex items-center justify-center text-white text-xl
              shadow-lg
            `}>
              {achievement.icon}
            </div>
            
            {/* Title and Rarity */}
            <div>
              <h3 className={`font-semibold ${config.textColor}`}>
                {achievement.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`${config.iconColor}`}>
                  {getRarityIcon(achievement.rarity)}
                </div>
                <span className={`text-xs font-medium ${config.textColor} capitalize`}>
                  {achievement.rarity}
                </span>
                <span className={`text-xs ${config.textColor} opacity-75`}>
                  • {achievement.points} điểm
                </span>
              </div>
            </div>
          </div>

          {/* Category Badge */}
          <div className="flex flex-col items-end space-y-1">
            <span className="text-2xl">
              {getCategoryIcon(achievement.category)}
            </span>
            <span className={`text-xs font-medium ${config.textColor} capitalize`}>
              {achievement.category}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm ${config.textColor} opacity-90 mb-3 leading-relaxed`}>
          {achievement.description}
        </p>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={config.textColor}>Tiến độ</span>
              <span className={config.textColor}>
                {achievement.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                style={{ width: `${achievement.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Completion Status */}
        {isCompleted && (
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className={config.textColor}>
              Đã hoàn thành {achievement.unlockedAt && 
                new Date(achievement.unlockedAt).toLocaleDateString('vi-VN')
              }
            </span>
          </div>
        )}
      </div>

      {/* Glow Effect for Completed Achievements */}
      {isCompleted && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

export default AchievementCard;