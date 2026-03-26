"use client";

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants';

export function WhatsAppButton() {
  return (
    <motion.a
      href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-colors"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.div>
      <span className="hidden sm:inline font-medium">Fale Conosco</span>
      
      {/* Pulse Effect */}
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
    </motion.a>
  );
}