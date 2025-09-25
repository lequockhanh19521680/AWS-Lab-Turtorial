import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import { Loader2, RefreshCw, TrendingUp, Clock, Users } from 'lucide-react';

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

interface SocialFeedProps {
  className?: string;
}

type FeedType = 'latest' | 'trending' | 'following';

const SocialFeed: React.FC<SocialFeedProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (type: FeedType = feedType, pageNum: number = 1, append: boolean = false) => {
    try {
      const endpoint = type === 'trending' ? '/api/feed/trending' : '/api/social/posts/feed';
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        ...(type === 'trending' && { timeframe: '7d' })
      });

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const newPosts = data.data.posts || [];

      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(newPosts.length === 10);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const loadInitialPosts = async () => {
    setLoading(true);
    await fetchPosts(feedType, 1, false);
    setLoading(false);
  };

  const loadMorePosts = async () => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPosts(feedType, nextPage, true);
  };

  const refreshPosts = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchPosts(feedType, 1, false);
    setRefreshing(false);
  };

  const handleFeedTypeChange = async (type: FeedType) => {
    setFeedType(type);
    setPage(1);
    setLoading(true);
    await fetchPosts(type, 1, false);
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.postId === postId 
          ? {
              ...post,
              userInteractions: {
                isLiked: !post.userInteractions?.isLiked,
                isShared: post.userInteractions?.isShared || false
              },
              likes: {
                count: post.userInteractions?.isLiked 
                  ? post.likes.count - 1 
                  : post.likes.count + 1
              }
            }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = async (postId: string) => {
    try {
      const response = await fetch(`/api/social/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to share post');
      }

      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.postId === postId 
          ? {
              ...post,
              shares: { count: post.shares.count + 1 }
            }
          : post
      ));
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleComment = (postId: string) => {
    // Navigate to post detail or open comment modal
    console.log('Comment on post:', postId);
  };

  useEffect(() => {
    loadInitialPosts();
  }, []);

  const feedTypeConfig = {
    latest: { label: 'Mới nhất', icon: Clock },
    trending: { label: 'Thịnh hành', icon: TrendingUp },
    following: { label: 'Đang theo dõi', icon: Users }
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Bảng tin</h2>
          <button
            onClick={refreshPosts}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Feed Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {Object.entries(feedTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            const isActive = feedType === type;
            
            return (
              <button
                key={type}
                onClick={() => handleFeedTypeChange(type as FeedType)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Đang tải...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chưa có bài viết nào
            </h3>
            <p className="text-gray-500">
              Hãy tạo viễn cảnh đầu tiên để bắt đầu!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              onLike={handleLike}
              onShare={handleShare}
              onComment={handleComment}
            />
          ))
        )}

        {/* Load More Button */}
        {hasMore && posts.length > 0 && (
          <div className="text-center py-6">
            <button
              onClick={loadMorePosts}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải...</span>
                </div>
              ) : (
                'Tải thêm'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialFeed;