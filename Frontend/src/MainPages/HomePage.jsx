import React from 'react';

export default function PresentationPage() {
  return (
    <div className=" h-full bg-[#000043]">

      {/* Efectul de picături */}
      <div className="rain"></div>

      {/* Hero Section */}
      <header className="text-center py-20 text-white">
        <h2 className="text-4xl font-bold">Firma de Construcții XYZ</h2>
        <p className="mt-4 text-lg">Oferim soluții complete în construcții civile, instalații sanitare și electrice, precum și mobilă la comandă.</p>
        <button className="mt-6 px-6 py-3 bg-white text-blue-600 font-semibold rounded-full shadow-md hover:bg-gray-200">
          Află mai multe
        </button>
      </header>

      {/* Restul secțiunilor (Servicii, Despre Noi, etc.) */}
      <section className="py-16 px-6 text-center">
        <h3 className="text-3xl font-bold mb-8">Serviciile Noastre</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 shadow-md rounded-lg">
            <h4 className="text-xl font-semibold">Instalații Sanitare</h4>
            <p className="mt-2 text-gray-600">Oferim servicii complete pentru instalații sanitare: de la proiectare și execuție la întreținere.</p>
          </div>
          <div className="bg-white p-6 shadow-md rounded-lg">
            <h4 className="text-xl font-semibold">Instalații Electrice</h4>
            <p className="mt-2 text-gray-600">Specializați în instalarea și întreținerea sistemelor electrice pentru orice tip de clădire.</p>
          </div>
          <div className="bg-white p-6 shadow-md rounded-lg">
            <h4 className="text-xl font-semibold">Construcții Civile</h4>
            <p className="mt-2 text-gray-600">Construim clădiri rezidențiale, comerciale și industriale cu respectarea celor mai înalte standarde de calitate.</p>
          </div>
          <div className="bg-white p-6 shadow-md rounded-lg">
            <h4 className="text-xl font-semibold">Mobilă Personalizată</h4>
            <p className="mt-2 text-gray-600">Creăm mobilier pe comandă, adaptat nevoilor și preferințelor tale, din cele mai bune materiale.</p>
          </div>
        </div>
      </section>

      {/* Alte secțiuni */}
      <footer className="bg-blue-600 text-white text-center py-4">
        <p>&copy; 2025 Firma XYZ. Toate drepturile rezervate.</p>
      </footer>

      {/* Stiluri pentru efectul de picături */}
      <style jsx>{`
        .rain {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .rain::after,
        .rain::before {
          content: '';
          position: absolute;
          top: -100%;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.8) 10%, transparent 10%);
          background-repeat: no-repeat;
          animation: rain 2s linear infinite;
        }

        .rain::before {
          animation-delay: 1s;
        }

        @keyframes rain {
          0% {
            top: -100%;
          }
          100% {
            top: 100%;
          }
        }

        .rain::after,
        .rain::before {
          animation-timing-function: ease-in-out;
        }
      `}</style>
    </div>
  );
}
