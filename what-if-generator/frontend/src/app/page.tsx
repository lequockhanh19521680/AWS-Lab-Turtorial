import StoryHub from '@/components/StoryHub'
import { Sparkles, Zap, Globe, Users, BookOpen, Lightbulb } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5"></div>
        <div className="relative container-modern py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-6 shadow-lg">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Cỗ Máy Nếu Như - Powered by AI</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-balance">
              Khám phá vô vàn 
              <span className="text-gradient"> kịch bản </span>
              tương lai
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
              Tạo ra những câu chuyện "Nếu như" độc đáo với sức mạnh của trí tuệ nhân tạo. 
              Khám phá những khả năng vô tận của tương lai.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="btn-gradient px-8 py-4 rounded-xl font-semibold text-lg">
                Bắt đầu tạo kịch bản
              </button>
              <button className="btn-ghost-modern px-8 py-4 rounded-xl font-semibold text-lg">
                Xem demo
              </button>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20 animate-float"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 dark:bg-purple-800 rounded-full opacity-20 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-indigo-200 dark:bg-indigo-800 rounded-full opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
      </section>

      {/* Main Story Hub */}
      <section className="py-16">
        <div className="container-modern">
          <StoryHub />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container-modern">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tính năng <span className="text-gradient">đột phá</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trải nghiệm công nghệ AI tiên tiến để tạo ra những câu chuyện tương lai độc đáo
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Kịch bản chuyên nghiệp</h3>
              <p className="text-muted-foreground">
                AI tạo ra kịch bản chi tiết với cấu trúc ACT chuyên nghiệp và hội thoại sống động
              </p>
            </div>
            
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Thuyết minh chất lượng cao</h3>
              <p className="text-muted-foreground">
                Giọng thuyết minh tự nhiên với công nghệ Text-to-Speech tiên tiến nhất
              </p>
            </div>
            
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Video 3D Premium</h3>
              <p className="text-muted-foreground">
                Trải nghiệm câu chuyện trong không gian 3D sống động và immersive
              </p>
            </div>
            
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Cộng đồng sáng tạo</h3>
              <p className="text-muted-foreground">
                Chia sẻ và khám phá kịch bản từ cộng đồng người dùng sáng tạo
              </p>
            </div>
            
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Thông minh</h3>
              <p className="text-muted-foreground">
                Thuật toán AI được huấn luyện để tạo ra những kịch bản logic và thú vị
              </p>
            </div>
            
            <div className="card-interactive p-8 text-center group">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Tùy chỉnh linh hoạt</h3>
              <p className="text-muted-foreground">
                Điều chỉnh độ dài, phong cách và tone của kịch bản theo ý muốn
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container-modern">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl lg:text-4xl font-bold text-gradient">10K+</div>
              <div className="text-muted-foreground">Kịch bản đã tạo</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl lg:text-4xl font-bold text-gradient">5K+</div>
              <div className="text-muted-foreground">Người dùng hài lòng</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl lg:text-4xl font-bold text-gradient">50+</div>
              <div className="text-muted-foreground">Chủ đề đa dạng</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl lg:text-4xl font-bold text-gradient">99%</div>
              <div className="text-muted-foreground">Độ chính xác AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-bg-subtle">
        <div className="container-modern text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">
            Sẵn sàng khám phá tương lai?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Tham gia cộng đồng những người khám phá tương lai và tạo ra những kịch bản "Nếu như" độc đáo của riêng bạn.
          </p>
          <button className="bg-white text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl">
            Bắt đầu miễn phí
          </button>
        </div>
      </section>
    </div>
  )
}