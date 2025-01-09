# Interview Coder

An invisible desktop application that will help you pass your technical interviews.

https://github.com/user-attachments/assets/caf1e6cd-27d5-4033-b8c5-9df1cb52b21d

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
   - Authenticate with OpenAI API key

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
- OpenAI API key (for AI features)
- Screen Recording Permission for Terminal/IDE
  - On macOS:
    1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording
    2. Ensure your Terminal app (or IDE) has screen recording permission enabled
    3. Restart your Terminal/IDE after enabling permissions
  - On Windows:
    - No additional permissions needed
  - On Linux:
    - May require `xhost` access depending on your distribution

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ibttf/interview-coder-v1.git
cd interview-coder-v1
```

2. Install dependencies:

```bash
npm install
# or if using bun
bun install
```

## Running Locally

1. Start the development server:

```bash
npm run app:dev
# or
bun run app:dev
```

This will:

- Start the Vite development server
- Launch the Electron application
- Enable hot-reloading for development

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenAI API

## Configuration

1. On first launch, you'll need to provide your OpenAI API key
2. The application will store your settings locally using electron-store

## Building (for Roy)

notarizing script is wack asf, we have an auto code signing in the package.json, but we need to manually notarize

```
xcrun notarytool store-credentials "my-apple-creds" \
  --apple-id "YOUR_APPLE_ID@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "XXXX-XXXX-XXXX-XXXX"
```

run that ^ and then cd into release and run

```


#intel
arch -arm64 xcrun notarytool submit "/Users/roylee0912/Development/interview-coder-v1/release/Interview Coder-1.0.0.dmg" \
  --keychain-profile "my-apple-creds" \
  --wait


#silicon
arch -arm64 xcrun notarytool submit "/Users/roylee0912/Development/interview-coder-v1/release/Interview Coder-1.0.0-arm64.dmg" \
  --keychain-profile "my-apple-creds" \
  --wait



xcrun stapler staple "Interview Coder-1.0.0.dmg"


xcrun stapler staple "Interview Coder-1.0.0-arm64.dmg"

#validating

xcrun stapler validate "/Users/roylee0912/Development/interview-coder-v1/release/Interview Coder-1.0.0.dmg"

xcrun stapler validate "/Users/roylee0912/Development/interview-coder-v1/release/Interview Coder-1.0.0-arm64.dmg"


```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
