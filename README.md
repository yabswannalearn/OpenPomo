# ⏱️ OpenPomo

OpenPomo is a premium, open-source Pomodoro productivity application designed to help you stay focused and track your progress with deep insights and a beautiful, modern interface.

![OpenPomo Dashboard](file:///C:/Users/reina/.gemini/antigravity/brain/65e723b5-f33e-4618-a215-c325d8b0973d/premium_dashboard_full_1766992319716.png)

## ✨ Features

- **Advanced Timer**: Customizable Pomodoro, Short Break, and Long Break durations.
- **Premium Dashboard**:
  - **Hourly Productivity**: Visualize your peak focus hours.
  - **Task Distribution**: See exactly where your time is going.
  - **Yearly Activity**: Track your consistency with a GitHub-style heatmap.
- **Task Management**: Integrated task list with Pomodoro estimates and tracking.
- **Immersive UX**:
  - **Brown Noise**: Built-in focused background sound.
  - **Dark/Light Mode**: Seamlessly switch between themes.
  - **Premium UI**: Crafted with Tailwind CSS and Radix UI components.
- **Cloud Sync**: Secure JWT-based authentication allows you to access your sessions from anywhere.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **Visualizations**: Recharts
- **Icons**: Lucide React

### Backend
- **Server**: Express.js
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Deployment**: Render (API), Vercel (Frontend)

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL database

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yabswannalearn/OpenPomo.git
   cd OpenPomo
   ```

2. **Backend Configuration**:
   - `cd server`
   - Create a `.env` file based on `.env.example`:
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/pomodoro"
     JWT_SECRET="your_secret_key"
     PORT=8000
     CORS_ORIGIN="http://localhost:3000"
     ```
   - Install dependencies: `npm install`
   - Run migrations: `npx prisma db push`
   - Start server: `npm run dev`

3. **Frontend Configuration**:
   - `cd client`
   - Create a `.env.local` file:
     ```env
     NEXT_PUBLIC_API_URL="http://localhost:8000/api"
     ```
   - Install dependencies: `npm install`
   - Start app: `npm run dev`

## 🌐 Deployment

### Backend (Render)
- Set build command: `npm install && npx prisma generate && npx prisma db push && npm run build`
- Set start command: `npm start`
- Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.

### Frontend (Vercel)
- Add environment variable: `NEXT_PUBLIC_API_URL` pointing to your Render API URL (with `/api` suffix).

## 📄 License

This project is open source and available under the MIT License.
