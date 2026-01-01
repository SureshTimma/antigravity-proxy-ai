# 🚀 Antigravity Proxy AI

**Unlimited AI Usage** - Access all premium AI models completely free using your Google account.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-38B2AC?logo=tailwind-css)
![npm](https://img.shields.io/npm/v/antigravity-proxy-ai?color=red&logo=npm)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Why Antigravity?

- 🆓 **Completely Free** - No API keys, no subscriptions, no credit card required
- 🤖 **All Premium Models** - Access Claude, Gemini, OpenAI GPT, and more
- 👥 **Multi-Account Support** - Connect multiple Google accounts and never run out of credits
- 🔄 **Auto Account Rotation** - Automatically switches accounts when rate limited
- 💻 **Beautiful Web UI** - Modern chat interface with dark mode
- ⚡ **Fast & Local** - Runs entirely on your machine

---

## 📋 Table of Contents
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Development Setup](#-development-setup)
- [Contributing](#-contributing)

---

## 📥 Installation

### Step 1: Open Terminal

**Windows:** Press `Win + R`, type `cmd`, and press Enter OR Manually search for `Command Prompt (cmd)` and open

**Mac/Linux:** Open Terminal

### Step 2: Install the package

Copy and paste this command into Terminal and press Enter:

```bash
npm install -g antigravity-proxy-ai
```


### ✅ Installation Complete!


---

## 🚀 Running the Application

After installation, every time you want to use the application:

### Open CMD and run:

```bash
antigravity-proxy-ai
```

**That's it!**:
1. ✅ The app will Start the proxy server on `http://localhost:8642`
2. ✅ The app will Start the web UI on `http://localhost:8643`
3. ✅ The app will Open your browser automatically

### First Time Setup

On first run, you'll need to add your Google account:
1. Go to **Settings** in the web application `(http://localhost:8643)`
2. Click **Add Account**
3. Follow the browser authentication prompts

---

## 🔄 Updating

When updates are available, you'll see a notification in the web UI. To update manually:

```bash
npm install -g antigravity-proxy-ai@latest
```

---

## ✨ Features

### 🤖 Available AI Models
Models available through the proxy (subject to change):

| Provider | Models |
|----------|--------|
| **Claude** | Sonnet 4.5, Sonnet 4.5 Thinking, Opus 4.5 Thinking |
| **Gemini** | 2.5 Flash Lite, 2.5 Flash, 2.5 Flash Thinking, 3 Flash, 2.5 Pro, 3 Pro Image, 3 Pro Low, 3 Pro High |
| **OpenAI** | GPT OSS 120B Medium |
| **Other** | Various experimental models |

> **Note:** Model availability depends on the upstream proxy and may change without notice.

### 💻 Application Features
- 🎨 **Modern Dark UI** - Clean, ChatGPT-style interface with smooth animations
- 💬 **Chat Interface** - Full conversation support with AI models
- 🔄 **Model Selector** - Switch between different AI models easily
- 📊 **Usage Tracking** - View rate limits and usage per account
- 👥 **Multi-Account** - Add unlimited Google accounts, auto-rotates when rate limited
- 🖥️ **Integrated Terminal** - Built-in terminal for proxy management
- 💾 **Chat History** - Persistent chat history stored locally
- 🌐 **Real-time Status** - Connection status indicator with auto-restart

## 📸 Screenshots

*Coming soon*

## 🛠️ Prerequisites

- **Node.js** v18 or higher - [Download here](https://nodejs.org/)
- A Google Account

> **Don't have Node.js?** Download and install it from [nodejs.org](https://nodejs.org/). Choose the LTS version.

---

## 🔧 Development Setup (For Developers)

If you want to contribute or modify the code:

```bash
# Clone the repository
git clone https://github.com/SureshTimma/antigravity-proxy-ai.git
cd antigravity-proxy-ai

# Install dependencies
npm install

# Run in development mode
npm run dev
```

---

## 📦 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    antigravity-proxy-ai                      │
│                                                              │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   Web UI     │ ──────► │  antigravity-claude-proxy │     │
│   │   :8643      │         │         :8642             │     │
│   └──────────────┘         └──────────────────────────┘     │
│         │                            │                       │
│         ▼                            ▼                       │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   Browser    │         │       AI Service         │     │
│   └──────────────┘         └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ Troubleshooting

### "npm is not recognized"
Node.js is not installed. Download it from [nodejs.org](https://nodejs.org/)

### "Permission denied" or "EACCES"
On Mac/Linux, you may need to use:
```bash
sudo npm install -g antigravity-proxy-ai
```

### Port already in use
Another application is using port 8642 or 8643. Close it or restart your computer.

### Browser doesn't open automatically
Manually open `http://localhost:8643` in your browser.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments & Credits

This project is a **web UI wrapper** built on top of:

- **[Antigravity Claude Proxy](https://github.com/badri-s2001/antigravity-claude-proxy)** by [@badri-s2001](https://github.com/badri-s2001) - The core CLI proxy that makes this possible. All credit for the proxy functionality goes to the original author.

Other technologies used:
- [Next.js](https://nextjs.org/) - The React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Beautiful icons
- [xterm.js](https://xtermjs.org/) - Terminal emulator

---

## ⚠️ Disclaimer

**IMPORTANT: Please read before using this software.**

### 📚 Educational Purpose Only
This project is created **strictly for educational and research purposes**. It is intended to demonstrate:
- How proxy servers work
- Web application development with Next.js
- Real-time terminal integration in web apps

### ⚖️ Legal Notice
- This is an **open-source project** with no commercial intent
- The developers of this project **do not own, operate, or control** any AI services
- We **do not claim any rights** to Claude, Gemini, OpenAI, or any other AI services
- All trademarks and brand names belong to their respective owners
- This project simply provides a UI for [antigravity-claude-proxy](https://github.com/badri-s2001/antigravity-claude-proxy)

### 👤 User Responsibility
- Users are **solely responsible** for how they use this software
- Users must comply with the **Terms of Service** of any services they access
- Users should ensure their usage complies with **local laws and regulations**
- The developers are **not responsible** for any misuse of this software

### 🚫 No Warranty
This software is provided "as is", without warranty of any kind. Use at your own risk.

### 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Suresh Timma**

[![GitHub](https://img.shields.io/badge/GitHub-SureshTimma-181717?logo=github)](https://github.com/SureshTimma)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sureshtimma-0A66C2?logo=linkedin)](https://www.linkedin.com/in/sureshtimma/)
[![Instagram](https://img.shields.io/badge/Instagram-suresh__timma-E4405F?logo=instagram)](https://www.instagram.com/suresh__timma/)

---

Made with ❤️ for the open-source community
