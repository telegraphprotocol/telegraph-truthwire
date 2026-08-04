import React from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-black py-8 border-t border-white/10">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Zap className="text-[#8b5cf6]" size={20} fill="currentColor" />
            <span className="text-white text-base font-bold">
              Sniper<span className="text-[#8b5cf6]">Bot</span>
            </span>
          </Link>
          <p className="text-gray-500 text-sm">
            © {currentYear} SniperBot. Beating the markets, 4.2s at a time.
          </p>
          <div className="flex space-x-6">
            <Link
              target="_blank"
              href="https://x.com/snipersh"
              className="text-gray-500 hover:text-[#8b5cf6] transition-colors"
            >
              <X size={20} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
