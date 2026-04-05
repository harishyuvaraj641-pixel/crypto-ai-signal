# crypto-ai-signal
 DEVELOPER: V S Harish yuvaraj
# 📈 Crypto AI Signal Bot

A professional-grade, full-stack cryptocurrency trading dashboard that combines real-time market data with advanced technical indicators and AI-driven predictive analysis.

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-v5-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-38B2AC.svg)](https://tailwindcss.com/)

---

## ✨ Features

- **Real-Time Data**: Live price streaming via Binance WebSockets for precise market tracking.
- **AI-Powered Signals**: Integrated with **NVIDIA NIM** and **OpenRouter** (Llama 3, Claude 3.5, etc.) for intelligent market sentiment and trend analysis.
- **Advanced Technical Indicators**: Automated calculation of MA, EMA, RSI, Bollinger Bands, and MACD.
- **Institutional Analysis**: Incorporates advanced metrics like VWAP and Volume Profile for higher signal accuracy.
- **Futuristic UI**: A premium dark-mode dashboard featuring glassmorphism aesthetics and responsive design.
- **Historical Analysis**: Pre-fetches historical data to prevent startup errors and provide immediate context.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Data Source**: Binance API (REST & WebSockets)
- **AI Orchestration**: Custom multi-provider bridge (OpenRouter, NVIDIA)
- **Indicators**: Pandas-TA / Custom mathematical implementations

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS / Vanilla CSS for custom glassmorphism
- **Charts**: Recharts / Lightweight-charts for high-performance visualization
- **State Management**: React Hooks + Context API

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Binance API Keys (optional for public data, required for trading)
- OpenRouter or NVIDIA NIM API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   OPENROUTER_API_KEY=your_key_here
   BINANCE_API_KEY=your_key_here
   BINANCE_API_SECRET=your_key_here
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```text
.
├── backend/                # FastAPI Application
│   ├── ai_providers/       # AI Model Integrations
│   ├── services/           # Market Data & Analysis logic
│   ├── utils/              # Helper functions
│   └── main.py             # Entry point
├── frontend/               # React Application
│   ├── src/                # Source code
│   │   ├── components/     # UI Components
│   │   ├── hooks/          # Custom React Hooks
│   │   └── App.jsx         # Main Dashboard logic
└── README.md               # You are here
```

---

## 🛡 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

*Disclaimer: This software is for educational purposes only. Do not use it for actual trading without thorough testing and risk management.*
