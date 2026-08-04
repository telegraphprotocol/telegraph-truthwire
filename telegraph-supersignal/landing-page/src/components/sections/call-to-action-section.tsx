import React from "react";
import Link from "next/link";
import { Button } from "../ui/button";

export default function CallToActionSection() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#8b5cf6]/10 to-transparent"></div>
      
      <div className="container relative z-10 space-y-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight"
          >
            Ready to outpredict <br />
            <span className="text-[#8b5cf6]">the Crowds?</span>
          </h2>
          <p
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
           Join the new era of autonomous market snipers—powered by localized ground-truth data and high-speed execution.
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row sm:justify-center gap-6"
        >
          <Button
            asChild
            className="inline-flex text-lg h-14 px-10 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-all duration-300 shadow-[0_0_30px_rgba(139,92,246,0.2)] rounded-2xl"
          >
            <Link href="http://localhost:5173/">Launch Sniper Now</Link>
          </Button>
          <Button
            asChild
            className="inline-flex text-lg h-14 px-10 border-white/10 hover:bg-white/5 text-white transition-all duration-300 rounded-2xl"
            variant="outline"
          >
            <Link href="https://docs.polysniper.com/">Read Whitepaper</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
