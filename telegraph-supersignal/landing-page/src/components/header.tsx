"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MenuIcon, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface INavigationMenuItem {
  title: string;
  href: string;
}

const menuItems: INavigationMenuItem[] = [
  { title: "How It Works", href: "/#howItWorks" },
  { title: "Features", href: "/#features" },
  { title: "Wallets", href: "/#wallets" },
  { title: "Docs", href: "https://docs.polysniper.com/" },
];

export default function Header() {
  return (
<header className="sticky top-0 w-full z-50 backdrop-blur-md bg-black/95 border-b border-gray-800">
      {/* Animated background shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
        <div className="absolute w-[200px] h-[200px] bg-[#8b5cf6] rounded-full opacity-20 top-10 left-20 animate-shape1"></div>
        <div className="absolute w-[150px] h-[150px] bg-[#3b82f6] rounded-full opacity-20 top-32 right-24 animate-shape2"></div>
        <div className="absolute w-[100px] h-[100px] bg-[#8b5cf6] rounded-full opacity-20 bottom-16 left-1/4 animate-shape3"></div>
      </div>

      <div className="container flex items-center justify-between h-20 px-6 lg:px-20 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center bg-[#8b5cf6]/20 rounded-lg">
            <Zap className="text-[#8b5cf6]" size={24} fill="currentColor" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">
            Sniper<span className="text-[#8b5cf6]">Bot</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 justify-center gap-8">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-gray-300 hover:text-white hover:scale-105 transition-transform duration-200"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* CTA + Mobile Menu */}
        <div className="flex items-center gap-3">
  
             <Button
            asChild
            className="hidden sm:inline-flex bg-[#8b5cf6] text-white px-6 py-2 rounded-lg hover:bg-[#7c3aed] hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Link href="http://localhost:5173/">Launch App</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-white">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="bg-black/95 text-white p-6 h-full flex flex-col justify-start"
            >
              <nav className="flex flex-col gap-6 mt-4 text-lg">
                {menuItems.map((item, idx) => (
                  <Link 
                    key={idx}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="hover:text-[#8b5cf6] transition-colors">
                    {item.title}
                  </Link>
                ))}

                <Button
                  asChild
                  className="mt-6 w-full rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] hover:scale-105 transition-all duration-200"
                >
                  <Link href="http://localhost:5173/">Launch App</Link>
                </Button>
           
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <style jsx>{`
        @keyframes shape1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes shape2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(15px) translateX(-15px); }
        }
        @keyframes shape3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(5px); }
        }

        .animate-shape1 { animation: shape1 6s ease-in-out infinite; }
        .animate-shape2 { animation: shape2 8s ease-in-out infinite; }
        .animate-shape3 { animation: shape3 5s ease-in-out infinite; }
      `}</style>
    </header>
  );
}
