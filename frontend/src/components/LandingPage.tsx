import React from "react";
import { Link } from "react-router-dom";

// Simple SVG icons for case management
const FolderIcon = () => (
  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const ChecklistIcon = () => (
  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="w-full flex items-center justify-between px-8 py-4 bg-white shadow">
        <div className="flex items-center gap-2">
          <FolderIcon />
          <span className="text-2xl font-bold text-blue-800 tracking-tight">CaseFlow</span>
        </div>
        <div className="flex gap-4">
          <Link to="/cases" className="px-4 py-2 rounded border border-blue-700 text-blue-700 font-semibold hover:bg-blue-50 transition">Sign in</Link>
          <button className="px-4 py-2 rounded bg-blue-700 text-white font-semibold shadow hover:bg-blue-800 transition">Request Demo</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <h1 className="text-5xl font-extrabold text-gray-900 text-center mb-4">
          Professional Case Management, <span className="text-blue-700">Powered by AI</span>
        </h1>
        <p className="text-xl text-gray-700 text-center mb-8 max-w-2xl">
          Streamline your workflow, ensure compliance, and make informed decisions with AI-driven summaries, recommendations, and a robust three-stage process.
        </p>
        <div className="flex gap-4 mb-12">
          <button className="px-8 py-3 bg-blue-700 text-white font-bold rounded-lg shadow hover:bg-blue-800 transition">Request Demo</button>
          <button className="px-8 py-3 border-2 border-blue-700 text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition">Learn More</button>
        </div>

        {/* Feature Card/Illustration */}
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl w-full flex flex-col items-center mb-8">
          <ChecklistIcon />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 mt-4">AI-Powered Case Summaries</h2>
          <p className="text-gray-700 text-center mb-4">
            Instantly generate comprehensive case summaries and actionable recommendations at every step of your workflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 w-full">
            <div className="flex flex-col items-center">
              <span className="text-blue-600 font-bold text-lg mb-1">1. Receive</span>
              <span className="text-gray-600 text-center text-sm">AI analyzes and extracts key data from new applications.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-blue-600 font-bold text-lg mb-1">2. Manage</span>
              <span className="text-gray-600 text-center text-sm">Get step-specific recommendations and track progress efficiently.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-blue-600 font-bold text-lg mb-1">3. Conclude</span>
              <span className="text-gray-600 text-center text-sm">AI validates completeness and generates final documentation.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage; 