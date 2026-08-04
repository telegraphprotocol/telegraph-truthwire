"use client";

import React from "react";
import { Bot, LucideIcon, ShieldCheck, Wallet } from "lucide-react";

interface HowItWorkStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: HowItWorkStep[] = [
  {
    icon: Wallet,
    title: "RainbowKit Integration",
    description: "Seamlessly connect any EVM wallet. We support MetaMask, Coinbase, and 100+ more.",
  },
  {
    icon: ShieldCheck,
    title: "Full Custody",
    description: "You maintain complete ownership of your private keys and funds at all times.",
  },
  {
    icon: Bot,
    title: "Permissioned Sniper",
    description: "Enable automated trading only when you're ready. The bot snipes, but you set the limits.",
  },
];

export default function WalletsSection() {
  return (
    <section id="wallets" className="relative py-32 bg-black overflow-hidden">
      {/* Background shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-72 h-72 bg-gradient-to-tr from-[#8b5cf6]/20 to-[#3b82f6]/20 rounded-full top-10 left-10 animate-blob"></div>
        <div className="absolute w-56 h-56 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8b5cf6]/20 rounded-full bottom-20 right-16 animate-blob animation-delay-2000"></div>
      </div>

      <div className="container relative z-10 px-6 lg:px-20 flex flex-col items-center">
        {/* Header */}
        <div className="text-center max-w-3xl mb-24">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Secure, Non-Custodial <br />
            <span className="text-[#8b5cf6]">Trading</span>
          </h2>
          <p className="text-gray-400 text-lg sm:text-xl">
            Connect your wallet and trade on Polygon or Base with zero friction. Sniper Bot executes verified opportunities while you retain full control over your assets.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative w-full flex flex-col items-center">
          {/* Mobile vertical line */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-[#8b5cf6]/50 to-transparent rounded-full"></div>

          <div className="flex flex-col w-full max-w-4xl relative z-10 space-y-32">
            {steps.map(({ icon: Icon, title, description }, idx) => {
              const isLeft = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`relative flex w-full justify-center lg:justify-${isLeft ? "start" : "end"}`}
                >
                  {/* Card */}
                  <div className="flex flex-col gap-4 p-8 bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-3xl shadow-xl hover:shadow-[#8b5cf6]/20 transform transition-all duration-500 hover:-translate-y-2 z-10 max-w-sm text-center lg:text-left">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{description}</p>
                  </div>

                  {/* Icon */}
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl border-2 border-[#8b5cf6] bg-black flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] z-20">
                    <Icon className="w-8 h-8 text-[#8b5cf6]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,-10px) scale(1.05); }
          66% { transform: translate(-15px,15px) scale(0.95); }
        }
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
}
