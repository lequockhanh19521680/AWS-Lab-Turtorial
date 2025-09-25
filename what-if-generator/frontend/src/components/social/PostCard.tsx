import React, { useState } from 'react';
import { Heart, Share2, MessageCircle, MoreHorizontal, User, Calendar } from 'lucide-react';

interface Post {
  postId: string;
  userId: string;
  title: string;
  content: string;
  type: 'achievement' | 'scenario' | 'milestone' | 'custom';
  images?: Array<{ url: string; caption?: string }>;
  tags: string[];
  likes: { count: number };
  shares: { count: number };
  comments: { count: number };
  userInteractions?: {
    isLiked: boolean;
    isShared: boolean;
  };
  createdAt: string;
  user?: {
    username: string;
    displayName: string;
    avatar?: string;
  };
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onComment?: (postId: string) => void;
  className?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onShare,
  onComment,
  className = ''
}) => {
  const [isLiked, setIsLiked] = useState(post.userInteractions?.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likes.count);
  const [shareCount, setShareCount] = useState(post.shares.count);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(post.postId);
  };

  const handleShare = () => {
    setShareCount(prev => prev + 1);
    onShare?.(post.postId);
  };

  const handleComment = () => {
    onComment?.(post.postId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    return `${Math.floor(diffInHours / 24)} ngày trước`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'scenario': return '📖';
      case 'milestone': return '🎯';
      default: return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      case 'scenario': return 'bg-blue-100 text-blue-800';
      case 'milestone': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {post.user?.avatar ? (
              <img 
                src={post.user.avatar} 
                alt={post.user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {post.user?.displayName || 'Người dùng'}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>@{post.user?.username || 'user'}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(post.type)}`}>
            {getTypeIcon(post.type)} {post.type}
          </span>
          <button className="p-1 hover:bg-gray-100 rounded-full">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {post.title}
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {post.images.map((image, index) => (
              <div key={index} className="relative">
                <img 
                  src={image.url} 
                  alt={image.caption || `Image ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {image.caption && (
                  <p className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-sm p-2 rounded">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          {/* Like */}
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>

          {/* Comment */}
          <button 
            onClick={handleComment}
            className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments.count}</span>
          </button>

          {/* Share */}
          <button 
            onClick={handleShare}
            className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-medium">{shareCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;