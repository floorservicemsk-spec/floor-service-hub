"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex gap-4"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-2 bg-white/80 border border-white/50">
        <Bot className="w-5 h-5 text-slate-600" />
      </div>

      {/* Typing indicator */}
      <div className="flex-1 max-w-3xl items-start flex flex-col">
        <div className="bg-white mr-auto px-5 py-4 rounded-2xl border border-white/60 shadow">
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 bg-slate-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-slate-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-slate-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
