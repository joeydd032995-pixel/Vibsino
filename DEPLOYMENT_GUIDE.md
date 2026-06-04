# Vibsino Telegram Bot Template: Deployment Guide

This guide provides comprehensive instructions for deploying your Vibsino Telegram Bot Template, covering both local development and production environments. It includes details on configuration, using the provided deployment scripts, and troubleshooting common issues.

## Table of Contents
1.  [Prerequisites](#1-prerequisites)
2.  [Getting Started](#2-getting-started)
    *   [Cloning the Repository](#cloning-the-repository)
    *   [Running the Interactive Deployment Script](#running-the-interactive-deployment-script)
3.  [Manual Configuration](#3-manual-configuration)
    *   [Backend Environment Variables](#backend-environment-variables)
    *   [Frontend Environment Variables](#frontend-environment-variables)
4.  [Setting Up the Telegram Bot](#4-setting-up-the-telegram-bot)
    *   [Obtaining a Bot Token](#obtaining-a-bot-token)
    *   [Setting the Webhook](#setting-the-webhook)
5.  [Running the Application](#5-running-the-application)
    *   [Development Mode](#development-mode)
    *   [Production Mode](#production-mode)
6.  [Troubleshooting](#6-troubleshooting)
    *   [Common Issues](#common-issues)
    *   [Debugging Tips](#debugging-tips)

## 1. Prerequisites
Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version 18 or higher. You can download it from [nodejs.org](https://nodejs.org/).
*   **pnpm**: A fast, disk space efficient package manager. If not installed, the deployment script will attempt to install it.
*   **Git**: For cloning the repository. Download from [git-scm.com](https://git-scm.com/).

## 2. Getting Started

### Cloning the Repository
First, clone the Vibsino Telegram Bot Template repository to your local machine:

```bash
git clone https://github.com/joeydd032995-pixel/Vibsino.git
cd Vibsino
```

### Running the Interactive Deployment Script
We provide interactive scripts to streamline the setup process. Choose the script appropriate for your operating system:

*   **Linux/macOS**: Use `deploy.sh`
*   **Windows**: Use `deploy.ps1` (PowerShell)

These scripts will guide you through entering necessary configuration settings, install dependencies, and set up the database.

#### For Linux/macOS:

```bash
chmod +x deploy.sh
./deploy.sh
```

#### For Windows (in PowerShell):

```powershell
.\deploy.ps1
```

The script will prompt you for the following:

*   **Telegram Bot Token**: Obtain this from BotFather on Telegram.
*   **WebApp URL**: The public URL where your Telegram Mini App will be hosted (e.g., `https://your-vibsino-app.com`).
*   **JWT Secret**: A secret key for JSON Web Token generation. You can press Enter to auto-generate one.
*   **Backend Port**: The port for the backend server (default: `3000`).
*   **Backend URL for Frontend**: The URL the frontend will use to communicate with the backend (default: `http://localhost:PORT`).

After collecting the information, the script will:
1.  Create `.env` files in both `backend/` and `webapp/` directories.
2.  Install all project dependencies using `pnpm`.
3.  Initialize the Prisma database.
4.  Build the frontend application.

## 3. Manual Configuration (Optional)
If you prefer to configure your environment manually or need to adjust settings after running the script, you can directly edit the `.env` files.

### Backend Environment Variables (`backend/.env`)

| Variable             | Description                                                                                                                                                           | Example Value                                | Default (if applicable) |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------- | :---------------------- |
| `PORT`               | The port on which the backend server will listen.                                                                                                       | `3000`                                       | `3000`                  |
| `DATABASE_URL`       | Connection string for your database. For production, consider PostgreSQL or MySQL.                                                                      | `file:./dev.db`                              | `file:./dev.db`         |
| `JWT_SECRET`         | A strong, random secret key used for signing JWTs. **Crucial for security; change this in production.**                                                 | `your-super-secret-jwt-key-change-this`      | Auto-generated            |
| `JWT_EXPIRES_IN`     | Expiration time for JWTs.                                                                                                                               | `7d`                                         | `7d`                    |
| `NODE_ENV`           | Node.js environment mode (`development`, `production`, `test`).                                                                                         | `production`                                 | `production`            |
| `TELEGRAM_BOT_TOKEN` | Your unique token obtained from BotFather. **Essential for bot functionality and `initData` validation.**                                               | `1234567890:ABCDEFGHIJKLMNO_PQRSTUVWXYZ`     |                         |
| `WEBAPP_URL`         | The public URL where your Telegram Mini App is hosted. Used by the bot to generate the "Launch Mini App" button.                                      | `https://your-vibsino-app.com`               |                         |

### Frontend Environment Variables (`webapp/.env`)

| Variable           | Description                                                                                                                             | Example Value                        | Default (if applicable) |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------- | :---------------------- |
| `VITE_BACKEND_URL` | The base URL of your deployed backend API. The frontend will use this to make API requests.                                             | `http://localhost:3000`              | `http://localhost:3000` |

## 4. Setting Up the Telegram Bot

### Obtaining a Bot Token
1.  Open Telegram and search for `@BotFather`.
2.  Start a chat with BotFather and send the `/newbot` command.
3.  Follow the instructions to choose a name and username for your bot.
4.  BotFather will provide you with an **HTTP API Token**. This is your `TELEGRAM_BOT_TOKEN`.

### Setting the Webhook
After deploying your backend, you need to tell Telegram where to send updates for your bot. This is done by setting a webhook.

Your webhook URL will be `YOUR_BACKEND_URL/api/webhook`.

There are several ways to set the webhook:

*   **Using the Bot API**: Make a `POST` request to `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook` with the `url` parameter set to your webhook URL.
    ```bash
    curl -F "url=https://your-backend-url.com/api/webhook" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
    ```
*   **Using grammY Webhook Manager**: If you are using grammY, you can use their webhook manager tool for easier setup: [telegram.tools/webhook-manager](https://telegram.tools/webhook-manager).

## 5. Running the Application

### Development Mode
For local development, you will need two terminal windows:

1.  **Start Backend**: Navigate to the `backend/` directory and run:
    ```bash
    pnpm dev
    ```
2.  **Start Frontend**: Navigate to the `webapp/` directory and run:
    ```bash
    pnpm dev
    ```

Your frontend will typically be available at `http://localhost:5173` (or another port if configured by Vite). Ensure your `VITE_BACKEND_URL` in `webapp/.env` points to your backend (e.g., `http://localhost:3000`).

### Production Mode
For production, it's recommended to build both the frontend and backend, and then use a process manager (like PM2) to keep your backend running.

1.  **Build Frontend**: (Already done by `deploy.sh`/`deploy.ps1`)
    ```bash
    cd webapp
    pnpm build
    ```
    The static files will be generated in `webapp/dist/`.

2.  **Build Backend**: (If your Hono setup requires a build step, otherwise it runs directly from source)
    ```bash
    cd backend
    pnpm build # If applicable
    ```

3.  **Start Backend**: Navigate to the `backend/` directory and run:
    ```bash
    pnpm start
    ```
    For persistent production deployment, consider using PM2:
    ```bash
    # Install PM2 globally if you haven't already
    pnpm add -g pm2
    # Start your backend application
    pm2 start pnpm --name "vibsino-backend" -- start
    # Save PM2 process list to restart on boot
    pm2 save
    ```

4.  **Serve Frontend**: Serve the `webapp/dist/` directory using a static file server (e.g., Nginx, Apache, or a cloud static hosting service).

## 6. Troubleshooting

### Common Issues

*   **`TELEGRAM_BOT_TOKEN is not set`**: Ensure your `TELEGRAM_BOT_TOKEN` is correctly set in `backend/.env` and that the backend server is restarted after changes.
*   **`Invalid Telegram init data`**: This usually means the `X-Telegram-Init-Data` header sent from the Mini App is invalid or tampered with. Double-check your `TELEGRAM_BOT_TOKEN` and ensure your `WEBAPP_URL` is correctly configured in the bot settings via BotFather.
*   **CORS Errors**: If your frontend cannot connect to the backend, check the `allowedOrigins` in `backend/src/index.ts` and ensure your frontend's URL is included. Also, verify `VITE_BACKEND_URL` in `webapp/.env` is correct.
*   **Database Connection Issues**: Ensure `DATABASE_URL` in `backend/.env` is correct and that Prisma migrations have been run (`pnpm prisma db push`).
*   **`pnpm: command not found`**: Install pnpm globally using `npm install -g pnpm`.

### Debugging Tips

*   **Check Backend Logs**: The backend will output logs to the console. Look for error messages there.
*   **Browser Console**: For frontend issues, open your browser's developer console (F12) and check for errors in the "Console" and "Network" tabs.
*   **Telegram Bot Logs**: If your bot isn't responding, check the webhook status via the Bot API or grammY webhook manager to ensure Telegram can reach your backend.
*   **`initData` Inspection**: In your frontend, you can temporarily log `window.Telegram.WebApp.initData` to the console to verify it's being generated correctly.

---

*This guide was generated by Manus AI.*
