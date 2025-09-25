import React from 'react';
import { Github, Chrome, Facebook } from 'lucide-react';

interface OAuthButtonsProps {
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
  loading?: boolean;
  className?: string;
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  onGoogleLogin,
  onFacebookLogin,
  loading = false,
  className = ''
}) => {
  const handleGoogleLogin = () => {
    if (onGoogleLogin) {
      onGoogleLogin();
    } else {
      // Default behavior - redirect to OAuth endpoint
      window.location.href = '/api/auth/google';
    }
  };

  const handleFacebookLogin = () => {
    if (onFacebookLogin) {
      onFacebookLogin();
    } else {
      // Default behavior - redirect to OAuth endpoint
      window.location.href = '/api/auth/facebook';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Chrome className="w-5 h-5 text-red-500" />
        <span className="text-gray-700 font-medium">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
        </span>
      </button>

      {/* Facebook Login */}
      <button
        onClick={handleFacebookLogin}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Facebook className="w-5 h-5" />
        <span className="font-medium">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Facebook'}
        </span>
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">hoặc</span>
        </div>
      </div>
    </div>
  );
};

export default OAuthButtons;