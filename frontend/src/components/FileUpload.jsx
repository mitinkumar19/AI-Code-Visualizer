import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  FileCode2,
  Sparkles,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const SUPPORTED_TYPES = [
  { label: 'PDF', ext: '.pdf', icon: FileText, color: '#ef4444' },
  { label: 'DOCX', ext: '.docx', icon: FileText, color: '#3b82f6' },
  { label: 'PNG', ext: '.png', icon: Image, color: '#10b981' },
  { label: 'JPG', ext: '.jpg,.jpeg', icon: Image, color: '#f59e0b' },
];

const FileUpload = ({ onCodeExtracted, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];

    if (!allowedExts.includes(ext)) {
      setUploadState('error');
      setErrorMessage(`Unsupported file type: ${ext}`);
      return;
    }

    setFileName(file.name);
    setUploadState('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { code, language } = response.data;

      if (!code || !code.trim()) {
        setUploadState('error');
        setErrorMessage('No code could be extracted from the file.');
        return;
      }

      setDetectedLang(language);
      setUploadState('success');

      // Send extracted code to parent after a brief delay for the success animation
      setTimeout(() => {
        onCodeExtracted(code, language);
      }, 1200);
    } catch (err) {
      setUploadState('error');
      const detail = err.response?.data?.detail || err.message || 'Upload failed.';
      setErrorMessage(detail);
    }
  }, [onCodeExtracted]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  }, [processFile]);

  const handleReset = useCallback(() => {
    setUploadState('idle');
    setErrorMessage('');
    setDetectedLang('');
    setFileName('');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          id="upload-close-btn"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/10">
            <FileCode2 size={18} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
              Extract Code from Files
              <Sparkles size={12} className="text-amber-400/60" />
            </h3>
            <p className="text-[11px] text-white/30 mt-0.5">Upload documents or screenshots — we'll extract the code automatically</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── IDLE STATE: Drop zone ── */}
          {uploadState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`upload-dropzone relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center gap-3 group ${
                  isDragging
                    ? 'upload-dropzone-active border-violet-400/50 bg-violet-500/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.15] hover:bg-white/[0.03]'
                }`}
                id="upload-dropzone"
              >
                <motion.div
                  animate={isDragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className={`p-3 rounded-full transition-colors duration-300 ${
                    isDragging
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-white/[0.04] text-white/25 group-hover:text-white/40 group-hover:bg-white/[0.06]'
                  }`}
                >
                  <Upload size={24} />
                </motion.div>

                <div className="text-center">
                  <p className={`text-sm font-medium transition-colors ${
                    isDragging ? 'text-violet-300' : 'text-white/50 group-hover:text-white/70'
                  }`}>
                    {isDragging ? 'Drop file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="text-[11px] text-white/25 mt-1">
                    or <span className="text-violet-400/60 underline underline-offset-2">browse files</span>
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="upload-file-input"
                />
              </div>

              {/* Supported file types */}
              <div className="flex items-center justify-center gap-3 mt-3">
                {SUPPORTED_TYPES.map((type) => (
                  <div
                    key={type.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]"
                  >
                    <type.icon size={11} style={{ color: type.color }} className="opacity-60" />
                    <span className="text-[10px] text-white/35 font-medium tracking-wide">{type.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── UPLOADING STATE: Spinner ── */}
          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-8 flex flex-col items-center gap-4"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                >
                  <Loader2 size={32} className="text-violet-400" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ boxShadow: ['0 0 0 0 rgba(139,92,246,0)', '0 0 0 16px rgba(139,92,246,0)'] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-violet-300">Extracting code...</p>
                <p className="text-[11px] text-white/30 mt-1 font-mono">{fileName}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <motion.div
                  className="h-1 w-1 rounded-full bg-violet-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                />
                <motion.div
                  className="h-1 w-1 rounded-full bg-violet-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                />
                <motion.div
                  className="h-1 w-1 rounded-full bg-violet-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS STATE ── */}
          {uploadState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 flex flex-col items-center gap-3 success-glow"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              >
                <CheckCircle size={36} className="text-emerald-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-300">Code extracted successfully!</p>
                <p className="text-[11px] text-white/30 mt-1 font-mono">{fileName}</p>
              </div>
              {detectedLang && detectedLang !== 'Unknown' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-300 font-medium">
                    Detected: {detectedLang}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── ERROR STATE ── */}
          {uploadState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="upload-shake rounded-xl border border-red-500/20 bg-red-500/[0.04] p-8 flex flex-col items-center gap-3"
            >
              <AlertCircle size={36} className="text-red-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-red-300">Extraction failed</p>
                <p className="text-[11px] text-red-300/60 mt-1 max-w-[300px]">{errorMessage}</p>
              </div>
              <button
                onClick={handleReset}
                className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/80 transition-all"
                id="upload-retry-btn"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default FileUpload;
