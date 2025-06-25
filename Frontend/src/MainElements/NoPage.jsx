// src/MainElements/NoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function NoPage() {
  return (
    <>
    <div></div>
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#ED29390] text-gray-300 p-6">
      {/* Emoji or Illustration */}
      <div className="text-6xl mb-4">🔍</div>

      {/* Headline */}
      <h1 className="text-4xl font-bold mb-2">404 – Pagina nu a fost găsită</h1>

      {/* Subtext */}
      <p className="text-lg mb-6 text-center max-w-md">
        Ne pare rău, dar pagina pe care încerci să o accesezi nu există sau a fost mutată.
      </p>

      {/* Go Home Button */}
      <Link
        to="/"
        className="inline-block bg-red-600 hover:bg-red-700 text-gray-300 font-medium py-3 px-6 rounded-lg shadow-lg transition transform hover:-translate-y-1"
      >
        Mergi la pagina principală
      </Link>
    </div>
    </>
  );
}
