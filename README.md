# 🚀 Antigravity Proxy AI

A modern, sleek web interface for managing and chatting with Claude AI through the [Antigravity Claude Proxy](https://github.com/badri-s2001/antigravity-claude-proxy).

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)
![npm](https://img.shields.io/npm/v/antigravity-proxy-ai?color=red&logo=npm)
![License](https://img.shields.io/badge/License-MIT-green)

## ⚡ Quick Start (Recommended)

Run with a single command - no installation required:

```bash
npx antigravity-proxy-ai
```

Or install globally:

```bash
npm install -g antigravity-proxy-ai
antigravity-proxy-ai
```

**That's it!** The app will:
1. ✅ Install `antigravity-claude-proxy` if not present
2. ✅ Start the proxy server
3. ✅ Start the web UI
4. ✅ Open your browser automatically

## ✨ Features

- 🎨 **Modern Dark UI** - Clean, ChatGPT-style interface with smooth animations
- 💬 **Chat Interface** - Full conversation support with Claude models
- 🔄 **Model Selector** - Switch between different Claude models easily
- 📊 **Usage Tracking** - View rate limits and usage per account
- 👥 **Account Management** - Add/remove Claude accounts from Settings
- 🖥️ **Integrated Terminal** - Built-in terminal for proxy management
- 💾 **Chat History** - Persistent chat history stored locally
- 🌐 **Real-time Status** - Connection status indicator with auto-restart

## 📸 Screenshots

*Coming soon*

## 🛠️ Prerequisites

- **Node.js** v18 or higher
- A Claude account (you'll be prompted to authenticate on first run)

## 🔧 Manual Installation (For Development)

```bash
# Clone the repository
git clone https://github.com/SureshTimma/antigravity-proxy-ai.git
cd antigravity-proxy-ai

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 📦 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    antigravity-proxy-ai                      │
│                                                              │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   Web UI     │ ──────► │  antigravity-claude-proxy │     │
│   │  :3000       │         │         :8080             │     │
│   └──────────────┘         └──────────────────────────┘     │
│         │                            │                       │
│         ▼                            ▼                       │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   Browser    │         │      Claude API          │     │
│   └──────────────┘         └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Antigravity Claude Proxy](https://github.com/badri-s2001/antigravity-claude-proxy) - The CLI proxy tool this UI is built for
- [Next.js](https://nextjs.org/) - The React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Beautiful icons
- [xterm.js](https://xtermjs.org/) - Terminal emulator

## ⚠️ Disclaimer

This project is for educational purposes. Please ensure you comply with Anthropic's terms of service when using Claude.

---

Made with ❤️ by [Suresh Timma](https://github.com/SureshTimma)
