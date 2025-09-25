import React, { useState, useEffect } from 'react';
import { User, Mail, MapPin, Globe, Calendar, Users, Heart, Share2, MessageCircle, Trophy, Star, Crown, Gem, Zap } from 'lucide-react';

interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: {
    url?: string;
    thumbnail?: string;
  };
  coverImage?: {
    url?: string;
  };
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  stats: {
    followers: number;
    following: number;
    posts: number;
    scenarios: number;
    totalLikes: number;
    level: number;
    reputation: number;
  };
  badges: Array<{
    badgeId: string;
    earnedAt: string;
    isDisplayed: boolean;
  }>;
  isVerified: boolean;
  lastActiveAt: string;
  createdAt: string;
}

interface UserProfileProps {
  userId?: string;
  username?: string;
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  userId, 
  username, 
  className = '' 
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = username 
        ? `/api/feed/users/username/${username}`
        : `/api/feed/users/${userId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId || username) {
      fetchProfile();
    }
  }, [userId, username]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-yellow-400 to-yellow-600';
    if (level >= 25) return 'from-purple-400 to-purple-600';
    if (level >= 10) return 'from-blue-400 to-blue-600';
    return 'from-green-400 to-green-600';
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 1000) return 'text-yellow-600';
    if (reputation >= 500) return 'text-purple-600';
    if (reputation >= 100) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">😞</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Không tìm thấy người dùng
          </h3>
          <p className="text-gray-500">
            {error || 'Người dùng này có thể không tồn tại hoặc đã bị khóa.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
        {profile.coverImage?.url && (
          <img 
            src={profile.coverImage.url} 
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Level Badge */}
        <div className="absolute top-4 right-4">
          <div className={`bg-gradient-to-r ${getLevelColor(profile.stats.level)} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg`}>
            Level {profile.stats.level}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="flex items-end -mt-12 mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold shadow-lg">
            {profile.avatar?.url ? (
              <img 
                src={profile.avatar.url} 
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8" />
            )}
          </div>
          
          {/* Verification Badge */}
          {profile.isVerified && (
            <div className="ml-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.displayName}
            </h1>
            {profile.isVerified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-gray-600 mb-3">
            <span>@{profile.username}</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Tham gia {formatDate(profile.createdAt)}</span>
            </div>
          </div>

          {profile.bio && (
            <p className="text-gray-700 mb-4 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Contact Info */}
          <div className="space-y-2">
            {profile.location && (
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Globe className="w-4 h-4" />
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {profile.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.followers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Người theo dõi</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.following.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Đang theo dõi</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.posts.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Bài viết</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getReputationColor(profile.stats.reputation)}`}>
              {profile.stats.reputation.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Điểm uy tín</div>
          </div>
        </div>

        {/* Achievement Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Thành tựu gần đây
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.badges.slice(0, 6).map((badge, index) => (
                <div 
                  key={index}
                  className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1"
                >
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {badge.badgeId}
                  </span>
                </div>
              ))}
              {profile.badges.length > 6 && (
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-sm font-medium text-gray-700">
                    +{profile.badges.length - 6} khác
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium">
            Theo dõi
          </button>
          <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Nhắn tin
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;