"use client";

import { useState } from "react";
import {Menu, X} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white shadow-md top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="text-2xl font-bold text-indigo-600 cursor-pointer">
          TSender
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 text-gray-700 font-medium">
          <a href="#" className="hover:text-indigo-600 transition">Home</a>
          <a href="#" className="hover:text-indigo-600 transition">Features</a>
          <a href="#" className="hover:text-indigo-600 transition">Docs</a>
          <a href="#" className="hover:text-indigo-600 transition">GitHub</a>
        </nav>

        {/* Wallet Button (Desktop) */}
        <div className="hidden sm:!block ">
          <ConnectButton />
        </div>

        {/* Hamburger (Mobile) */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          <a href="#" className="block text-gray-700 hover:text-indigo-600">Home</a>
          <a href="#" className="block text-gray-700 hover:text-indigo-600">Features</a>
          <a href="#" className="block text-gray-700 hover:text-indigo-600">Docs</a>
          <a href="#" className="block text-gray-700 hover:text-indigo-600">GitHub</a>
          <div className="pt-4">
            <ConnectButton />
          </div>
        </div>
      )}
    </header>
  );
}
