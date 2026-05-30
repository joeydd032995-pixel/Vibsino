#!/bin/bash

echo "🚀 Setting up Vibsino Telegram Bot Template..."

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend
pnpm install

echo "🗄️ Initializing database..."
pnpm prisma generate
pnpm prisma db push

# Frontend setup
echo "📦 Installing frontend dependencies..."
cd ../webapp
pnpm install

echo "✅ Setup complete!"
echo "📝 Next steps:"
echo "1. Copy .env.example to .env in both backend and webapp (or root if using a monorepo manager)"
echo "2. Set your TELEGRAM_BOT_TOKEN in the backend .env"
echo "3. Run 'pnpm dev' in both backend and webapp directories"
