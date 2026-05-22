#!/bin/bash
# ============================================
# 博客系统一键部署脚本
# 适用于: macOS / Linux
# 前置条件: Git, Node.js 20+, Bun (可选)
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok() { echo -e "${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err() { echo -e "${RED}✗ $1${NC}"; }

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║   Java全栈+AI转型博客 - 一键部署        ║"
echo "║   Next.js 14 + Claude AI + RAG          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# Step 1: 环境检查
# ============================================
print_step "1/6 环境检查"

# Node.js
if ! command -v node &> /dev/null; then
    print_err "Node.js 未安装"
    echo "  请安装 Node.js 20+: https://nodejs.org/"
    echo "  或使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_err "Node.js 版本过低 (当前: $(node -v), 需要: 20+)"
    exit 1
fi
print_ok "Node.js $(node -v)"

# npm
if ! command -v npm &> /dev/null; then
    print_err "npm 未安装"
    exit 1
fi
print_ok "npm $(npm -v)"

# Bun (可选，用于加速 embedding 构建)
if command -v bun &> /dev/null; then
    print_ok "Bun $(bun --version) (已安装，将加速 embedding 构建)"
    PKG_RUNNER="bun"
else
    print_warn "Bun 未安装 (可选 - 将使用 npx tsx 代替)"
    print_warn "  安装 Bun: curl -fsSL https://bun.sh/install | bash"
    PKG_RUNNER="npx tsx"
fi

# Git
if ! command -v git &> /dev/null; then
    print_err "Git 未安装"
    exit 1
fi
print_ok "Git $(git --version | awk '{print $3}')"

# ============================================
# Step 2: 安装依赖
# ============================================
print_step "2/6 安装项目依赖"

npm install
print_ok "依赖安装完成"

# ============================================
# Step 3: 配置环境变量
# ============================================
print_step "3/6 配置环境变量"

if [ -f .env.local ]; then
    print_warn ".env.local 已存在，跳过创建"
    echo "  如需重新配置，请删除 .env.local 后重新运行"
else
    echo ""
    echo "需要配置以下 API 密钥（按回车跳过可稍后手动编辑）:"
    echo ""

    # Anthropic API
    echo -e "${YELLOW}[1] Claude AI API 配置${NC}"
    echo "  用于 AI 对话助手。获取方式:"
    echo "  - 官方: https://console.anthropic.com/account/keys"
    echo "  - 阿里内部代理: https://1688openai.alibaba-inc.com"
    echo ""
    read -p "  ANTHROPIC_API_KEY (Claude API密钥): " ANTHROPIC_KEY
    read -p "  ANTHROPIC_BASE_URL (留空使用官方地址): " ANTHROPIC_URL
    ANTHROPIC_URL=${ANTHROPIC_URL:-"https://api.anthropic.com"}

    # Embedding API
    echo ""
    echo -e "${YELLOW}[2] Embedding API 配置${NC}"
    echo "  用于文章向量化搜索(RAG)。获取方式:"
    echo "  - ModelScope: https://modelscope.cn → API Inference → 获取 Token"
    echo "  - 或使用其他 OpenAI 兼容的 Embedding 服务"
    echo ""
    read -p "  EMBEDDING_API_KEY: " EMBEDDING_KEY
    read -p "  EMBEDDING_API_BASE (默认 ModelScope): " EMBEDDING_BASE
    EMBEDDING_BASE=${EMBEDDING_BASE:-"https://api-inference.modelscope.cn/v1"}
    read -p "  EMBEDDING_MODEL (默认 Qwen/Qwen3-Embedding-8B): " EMBEDDING_MODEL
    EMBEDDING_MODEL=${EMBEDDING_MODEL:-"Qwen/Qwen3-Embedding-8B"}

    # Supabase (评论系统，可选)
    echo ""
    echo -e "${YELLOW}[3] Supabase 配置 (可选 - 评论/聊天记录持久化)${NC}"
    echo "  获取方式: https://supabase.com → New Project → Settings → API"
    echo "  数据库 Schema 在 supabase/schema.sql"
    echo ""
    read -p "  NEXT_PUBLIC_SUPABASE_URL (留空跳过): " SUPABASE_URL
    read -p "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_KEY

    # 笔记目录
    echo ""
    echo -e "${YELLOW}[4] 个人笔记目录 (可选 - 同步个人笔记到博客)${NC}"
    echo "  支持 Markdown 文件目录，多个目录用逗号分隔"
    echo ""
    read -p "  NOTES_DIRS (如 ~/notes,~/docs): " NOTES_DIRS

    # 写入 .env.local
    cat > .env.local << EOF
# ============================================
# 博客系统环境变量
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# Claude AI API
ANTHROPIC_BASE_URL=${ANTHROPIC_URL}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
CHAT_MODEL=claude-sonnet-4-6

# Embedding API (RAG 向量搜索)
EMBEDDING_API_KEY=${EMBEDDING_KEY}
EMBEDDING_API_BASE=${EMBEDDING_BASE}
EMBEDDING_MODEL=${EMBEDDING_MODEL}

# 个人笔记目录
NOTES_DIRS=${NOTES_DIRS}

# Supabase (评论系统)
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}

# Groq Whisper API (可选 - B站视频转录)
# 获取: https://console.groq.com → API Keys
GROQ_API_KEY=
EOF

    print_ok ".env.local 已创建"
fi

# ============================================
# Step 4: 构建 Embedding 索引
# ============================================
print_step "4/6 构建文章 Embedding 索引"

if [ -z "$EMBEDDING_KEY" ] && ! grep -q "EMBEDDING_API_KEY=." .env.local 2>/dev/null; then
    print_warn "未配置 Embedding API，跳过索引构建"
    print_warn "AI 搜索功能将不可用，配置后运行: npm run build:embeddings"
else
    echo "正在构建文章向量索引..."
    if [ "$PKG_RUNNER" = "bun" ]; then
        bun run scripts/build-embeddings.ts || print_warn "Embedding 构建失败，可稍后手动运行"
    else
        npx tsx scripts/build-embeddings.ts || print_warn "Embedding 构建失败，可稍后手动运行"
    fi
fi

# ============================================
# Step 5: 构建项目
# ============================================
print_step "5/6 构建项目"

npm run build
print_ok "项目构建成功"

# ============================================
# Step 6: 完成
# ============================================
print_step "6/6 部署完成!"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗"
echo "║           🎉 部署成功!                  ║"
echo "╚══════════════════════════════════════════╝${NC}"
echo ""
echo "启动方式:"
echo "  开发模式:  npm run dev        → http://localhost:3000"
echo "  生产模式:  npm run start      → http://localhost:3000"
echo ""
echo "可选操作:"
echo "  构建 Embedding:   npm run build:embeddings"
echo "  同步笔记:         npm run sync-notes"
echo "  获取 RSS 资讯:    npm run fetch:feeds"
echo "  监听文章变更:     npm run watch:articles"
echo ""

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "" ]; then
    echo -e "${YELLOW}提示: 未配置 Supabase，评论/聊天持久化功能不可用${NC}"
    echo "  1. 在 https://supabase.com 创建项目"
    echo "  2. 执行 supabase/schema.sql 创建表"
    echo "  3. 在 .env.local 中填入 URL 和 Key"
    echo ""
fi

echo "文档:"
echo "  项目结构:    cat ARCHITECTURE.md"
echo "  AI 配置:     cat AI_SETUP.md"
echo "  部署指南:    cat README.md"
echo ""
echo -e "${BLUE}开始开发: npm run dev${NC}"
