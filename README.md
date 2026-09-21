# 🌉 ShilpSetu

> *A full-stack platform empowering traditional artisans with modern digital tools.*

## 📖 About The Project
**ShilpSetu** is an interactive platform built to connect local artisans with the digital world. Built on a modern React and Express stack, the application provides powerful utilities including AI integration, dynamic QR code generation, and instant PDF document creation, wrapped in a smooth, animated user interface.

## ✨ Features
Based on the current technical implementation, ShilpSetu includes:
- **AI-Powered Capabilities:** Integrated with Google Gemini AI (`@google/genai`).
- **Dynamic Documents:** Generate and download high-quality PDFs directly from the platform (`jspdf` + `html2canvas`).
- **QR Code Sharing:** Instant QR code generation for easy sharing of profiles or items (`qrcode.react`).
- **Interactive UI:** Fluid animations and interactive feedback, including celebration effects for successful actions (`motion` & `canvas-confetti`).
- **Modern Styling:** Fully responsive and styled utilizing Tailwind CSS v4.
- and more.

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js, esbuild
- **AI Integration:** Google GenAI API
- **UI Libraries:** Lucide React (Icons), Motion (Animations)

## ⚙️ Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm
- A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/PoddarMeghadri/SHILPSETU.git](https://github.com/PoddarMeghadri/SHILPSETU.git)

2. Navigate to the project directory

```bash
cd SHILPSETU
```

**3. Install dependencies**
Install all required frontend and backend packages:
```bash
npm install
```

4. Set up Environment Variables
Create a new file named .env in the root folder of the project. Add your necessary configuration variables (update with your actual keys):

```Code snippet
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

🚀 Running the Application
This project uses custom scripts to manage the Vite frontend and the Express/esbuild backend.

Run in Development Mode:
Starts the development server using tsx for hot-reloading the backend and Vite for the frontend.

```Bash
npm run dev
```

### Supabase production configuration

Normal-user authentication is provided by Supabase Auth. Configure these
public client variables in Vercel for **Preview and Production**, then create a
new deployment:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

The app sends and verifies six-digit OTPs through `signInWithOtp` and
`verifyOtp`; signup and recovery never call Supabase link-based APIs. In
Supabase Dashboard > Authentication > Email Templates, configure the **Magic
Link** template to display `{{ .Token }}` and remove
`{{ .ConfirmationURL }}`. The app does not use the Confirm signup template.
Apply all migrations in `supabase/migrations` to the same project before
testing signup or recovery.

Build for Production:
Builds the Vite frontend and bundles the Express backend (server.ts) into a CommonJS format (dist/server.cjs) using esbuild.

```Bash
npm run build
```

Start Production Server:
Runs the bundled production server (Make sure to run npm run build first).

```Bash
npm start
```


🛠️ Utility Commands
Check for TypeScript errors (Linting):

```Bash
npm run lint
```

Clean build directories (Removes dist and compiled files):

```Bash
npm run clean
```
