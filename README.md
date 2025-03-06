# Interview Coder (but now self-hostable and free)

An invisible desktop application that will help you pass your technical interviews.

https://www.interviewcoder.co (explains all the features)

https://github.com/user-attachments/assets/0615b110-2670-4b0e-bc69-3c32a2d8a996

## How to self host for free?

For image -> text translation, I went with gpt-4o. For answer generation, I've used claude 3.7 sonnet becauses it's the best. Both of these is easily changeable, and you can modify our own prompts too at backend/src/controllers

### Requirements

- Bun installed (https://bun.sh/docs/installation)
- OpenAI API key
- Anthropic API key
- Supabase account (for auth and database). We need `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Also supabase CLI installed
- Docker (optional, for hosting backend)

### Steps

1. Clone the repository

```bash
git clone https://github.com/woaitsAryan/interview-coder-self-host
cd interview-coder-self-host

bun install
```

1. Create `.env` files and populate with the appropriate credentials

```bash
cp .env.sample .env
cp .env.local.sample .env.local
```

3. Login with your supabase CLI and do migrations

```bash
supabase login
supabase db push
```

4. Build the app for your platform

For this step, remember that whatever BACKEND_URL is in .env will be used as the backend url for the app. If you want to self-host it in a server, you'll have to change the URL and re-build this

```bash
bun run build
```

1. Run the backend

Either run it directly with bun:

```bash
bun run backend:dev
```

Or run it with docker:

```bash
bun run compose:build && bun run compose:up
```

6. Install the app

Go to releases/ folder and then find your .exe or .dmg or whatever and install it. 

On install, you'll see a sign in page, click on the sign-up button, I'd recommend to just disable email otp, so you can directly sign up with email. After sign-up, it will just work

That's it? yay! Do as you plesae!

### Some small caveats/issues you might experience:

- If you are running the app in dev using `bun run dev` so it'll open the developer console too by default so make sure to close that if you don't need it.
- I don't know how to close this app lol, I just go to process manager and kill it

## Invisibility Compatibility

The application is invisible to:

- Zoom versions below 6.1.6 (inclusive)
- All browser-based screen recording software
- All versions of Discord
- Mac OS _screenshot_ functionality (Command + Shift + 3/4)

Note: The application is **NOT** invisible to:

- Zoom versions 6.1.6 and above
  - https://zoom.en.uptodown.com/mac/versions (link to downgrade Zoom if needed)
- Mac OS native screen _recording_ (Command + Shift + 5)

## Features

- 🎯 99% Invisibility: Undetectable window that bypasses most screen capture methods
- 📸 Smart Screenshot Capture: Capture both question text and code separately for better analysis
- 🤖 AI-Powered Analysis: Automatically extracts and analyzes coding problems
- 💡 Solution Generation: Get detailed explanations and solutions
- 🔧 Real-time Debugging: Debug your code with AI assistance
- 🎨 Window Management: Freely move and position the window anywhere on screen

## Global Commands

The application uses unidentifiable global keyboard shortcuts that won't be detected by browsers or other applications:

- Toggle Window Visibility: [Control or Cmd + b]
- Move Window: [Control or Cmd + arrows]
- Take Screenshot: [Control or Cmd + H]
- Process Screenshots: [Control or Cmd + Enter]
- Reset View: [Control or Cmd + R]
- Quit: [Control or Cmd + Q]

## Usage

1. **Initial Setup**

   - Launch the invisible window
   - Login and subscribe

2. **Capturing Problem**

   - Use global shortcut [Control or Cmd + H] to take screenshots
   - Screenshots are automatically added to the queue of up to 5.

3. **Processing**

   - AI analyzes the screenshots to extract:
     - Problem requirements
     - Code context
   - System generates optimal solution strategy

4. **Solution & Debugging**

   - View generated solutions
   - Use debugging feature to:
     - Test different approaches
     - Fix errors in your code
     - Get line-by-line explanations
   - Toggle between solutions and queue views

5. **Window Management**
   - Move window freely using global shortcut
   - Toggle visibility as needed
   - Window remains invisible to specified applications
   - Reset view using Command + R

## Prerequisites

- Node.js (v16 or higher)
- npm or bun package manager
- Subscription on https://www.interviewcoder.co/settings (not needed for self-hosting)
- Screen Recording Permission for Terminal/IDE
  - On macOS:
    1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording
    2. Ensure that Interview Coder has screen recording permission enabled
    3. Restart Interview Coder after enabling permissions
  - On Windows:
    - No additional permissions needed
  - On Linux:
    - May require `xhost` access depending on your distribution

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenAI API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
