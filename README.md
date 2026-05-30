# Vibsino Telegram Bot Template

This repository provides a portable and plug-and-play template for building Telegram Mini Apps with a robust backend and a dynamic frontend. It leverages Hono for the backend API, grammY for Telegram bot interactions, and React with Vite for the frontend Mini App.

## ✨ Features

- **Telegram Mini App Integration**: Seamlessly integrates with Telegram Mini Apps, providing a rich user experience directly within Telegram.
- **Hono Backend**: A fast, lightweight, and modern backend built with Hono, suitable for various deployment environments (Node.js, Bun, Cloudflare Workers).
- **grammY Bot**: Utilizes the grammY library for efficient and scalable Telegram bot development, handling commands and webhooks.
- **Secure Authentication**: Implements secure authentication using Telegram `initData` validation and JWTs for API access.
- **React Frontend**: A responsive and interactive frontend built with React, TypeScript, and Vite, styled with Tailwind CSS and shadcn/ui.
- **Prisma ORM**: Type-safe database access with Prisma, configured for SQLite by default for easy local development, with support for PostgreSQL and MySQL.
- **Modular Structure**: Clear separation of concerns with a well-organized directory structure for both backend and frontend.
- **Easy Configuration**: Simplified environment variable management with a `.env.example` file.
- **Quick Setup Script**: A convenient `setup.sh` script to get your development environment up and running quickly.

## 🚀 Quick Start

Follow these steps to get your Vibsino Telegram Bot Template running locally:

### 1. Clone the Repository

```bash
git clone https://github.com/joeydd032995-pixel/Vibsino.git
cd Vibsino
```

### 2. Environment Configuration

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
```

Edit the newly created `.env` file and provide your `TELEGRAM_BOT_TOKEN` (obtained from BotFather) and `WEBAPP_URL` (the URL where your Mini App will be hosted).

### 3. Run the Setup Script

Make the setup script executable and run it:

```bash
chmod +x setup.sh
./setup.sh
```

This script will install dependencies for both backend and frontend, and initialize the Prisma database.

### 4. Start Development Servers

Open two separate terminal windows. In the first, navigate to the `backend` directory and start the backend server:

```bash
cd backend
pnpm dev
```

In the second terminal, navigate to the `webapp` directory and start the frontend development server:

```bash
cd webapp
pnpm dev
```

Your Telegram Mini App will be accessible at the `WEBAPP_URL` you configured, and your bot will be ready to receive updates via the webhook.

## 📂 Project Structure

```
/
├── .env.example               # Example environment variables
├── README.md                  # Project documentation
├── setup.sh                   # Quick setup script
├── backend/
│   ├── src/
│   │   ├── bot/               # grammY bot logic (commands, handlers)
│   │   ├── config/            # Environment and app configuration
│   │   ├── middleware/        # Telegram initData validation, rate limiting
│   │   ├── routes/            # API endpoints (Auth, User, Games, Telegram Auth)
│   │   ├── services/          # Business logic
│   │   └── index.ts           # Hono app entry point & webhook setup
│   ├── prisma/                # Database schema and migrations
│   └── package.json           # Backend dependencies
└── webapp/
    ├── src/
    │   ├── mini-app/          # Telegram Mini App specific components and context
    │   ├── components/        # Shared UI components
    │   ├── pages/             # React pages
    │   ├── lib/               # API client, utilities
    │   └── App.tsx            # Main React application entry point
    └── package.json           # Frontend dependencies
```

## ⚙️ Configuration

The `.env` file (created from `.env.example`) contains the following important variables:

- `PORT`: The port on which the backend server will run (default: `3000`).
- `DATABASE_URL`: Connection string for your database (default: `file:./dev.db` for SQLite).
- `JWT_SECRET`: A secret key for JWT token generation. **Change this in production!**
- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot API token. **Required for bot functionality and `initData` validation.**
- `WEBAPP_URL`: The public URL where your Telegram Mini App is hosted. This is used to generate the "Launch Mini App" button in the bot.
- `VITE_BACKEND_URL`: The URL of your backend API, used by the frontend.

## 🐳 Deployment

This template is designed for flexible deployment. You can deploy the backend and frontend separately or together, depending on your hosting provider.

### Backend Deployment
The Hono backend can be deployed to platforms like Vercel, Cloudflare Workers, or a traditional Node.js/Bun server. Ensure that your `TELEGRAM_BOT_TOKEN` and `WEBAPP_URL` environment variables are correctly set in your deployment environment.

**Webhook Setup**: After deployment, you need to set your bot\'s webhook URL to `YOUR_BACKEND_URL/api/webhook` using the Bot API or a tool like grammY\'s webhook manager.

### Frontend Deployment
The React frontend (Telegram Mini App) can be deployed as a static site to platforms like Vercel, Netlify, or GitHub Pages. Ensure `VITE_BACKEND_URL` points to your deployed backend API.

## 🤝 Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## 📄 License

This project is licensed under the MIT License.
