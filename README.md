# 👁️ AI Code Visualizer

A production-grade, local-first platform designed to visualize, analyze, and explain code with exceptional clarity. Built with a sophisticated architecture using FastAPI, React, and Groq's high-speed LLM inference.

![Status](https://img.shields.io/badge/Status-v1.0_Polished-success?style=flat-square) ![AI](https://img.shields.io/badge/AI-Groq_Inference-blue?style=flat-square) ![Architecture](https://img.shields.io/badge/Architecture-FastAPI_+_React-orange?style=flat-square)

---

## ✨ Why This is Better Than Others

Most code analyzers rely on generic, slow LLM calls or clunky interfaces. **AI Code Visualizer** is engineered differently:

*   **Lightning Fast Inference:** Powered by Groq technology, providing near-instantaneous code explanations and visualizations compared to traditional endpoints.
*   **Intuitive UI/UX:** Built with React 19 and Framer Motion for premium micro-interactions, smooth layout transitions, and a sleek, modern aesthetic.
*   **Privacy & Local Execution:** The backend engine runs locally on your machine, ensuring your code stays on your infrastructure.
*   **Robust Backend:** Utilizes FastAPI for high-performance, asynchronous request handling, ensuring the UI remains responsive even during heavy analysis.

---

## 🛠️ Technology Stack

**Backend (The Brain)**
*   **FastAPI:** High-performance Python web framework for blazing-fast API routes.
*   **Groq:** Employed for high-speed, accurate code understanding and explanation generation.
*   **Pydantic:** Strict data validation and settings management.
*   **Uvicorn:** Lightning-fast ASGI server.

**Frontend (The Interface)**
*   **React 19:** Modern, fast UI development.
*   **Vite:** Next-generation frontend tooling for instant server starts and lightning-fast HMR.
*   **Tailwind CSS (v4):** Utility-first styling for a sleek, modern aesthetic.
*   **Framer Motion:** Premium micro-interactions and smooth layout transitions.
*   **Lucide React:** Beautiful, consistent iconography.

---

## 📁 Project Structure

```text
├── backend/
│   ├── app.py           # FastAPI Entry Point
│   ├── executor.py      # Core Execution & Visualization Engine
│   └── requirements.txt # Python Dependencies
├── frontend/            # React + Vite Frontend
│   ├── src/             # UI Components & Application Logic
│   ├── public/          # Static Assets
│   └── package.json     # Node Dependencies
├── run.ps1              # Unified startup script for Windows
└── README.md            # Project Documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
*   Python 3.10+
*   Node.js 18+
*   Groq API Key (for AI generation)

### 2. Fast Launch (Recommended)
We provide a unified script to start both backend and frontend with a single command:

**Windows (PowerShell):**
```powershell
# This will open instances for backend and frontend
.\run.ps1
```

---

## ⚙️ Detailed Installation (Manual)

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Add your GROQ_API_KEY to a .env file in the backend directory

# Run the server
uvicorn app:app --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
