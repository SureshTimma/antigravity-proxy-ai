# 🚀 Antigravity Proxy AI

A modern, sleek web interface for managing and chatting with Claude AI through the [Antigravity Claude Proxy](https://github.com/badri-s2001/antigravity-claude-proxy).

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green)

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

Before running this app, you need:

1. **Node.js** (v18 or higher)
2. **Antigravity Claude Proxy** installed and configured
   ```bash
   npm install -g antigravity-claude-proxy
   ```
3. At least one authenticated Claude account

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/SureshTimma/antigravity-proxy-ai.git
cd antigravity-proxy-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

### 4. Open in browser

Navigate to [http://localhost:3000](http://localhost:3000)

The app will automatically start the Antigravity Claude Proxy when you open a new chat.

## 📦 Production Build

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
antigravity-proxy-ai/
├── app/
│   ├── api/              # API routes for proxy communication
│   │   ├── chat/         # Chat streaming endpoint
│   │   └── proxy/        # Proxy management endpoints
│   ├── components/       # React components
│   │   ├── ChatInterface.js
│   │   ├── Sidebar.js
│   │   ├── SettingsView.js
│   │   └── WebTerminal.js
│   ├── lib/              # Utility functions
│   ├── globals.css       # Global styles
│   ├── layout.js         # Root layout
│   └── page.js           # Main page
├── public/               # Static assets
├── server.js             # Custom server for Socket.io
└── package.json
```

## ⚙️ Configuration

The app connects to the Antigravity Claude Proxy at `localhost:8080` by default. This is configured in the API routes.

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
