import React from 'react';
import { Link } from 'react-router-dom';
// Importăm FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// Imaginea setată exact pe numele cerut
import dogImage from '../assets/404.png';

export default function NoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">

      <div className="w-full max-w-2xl flex flex-col items-center text-center">

        {/* Imaginea: Calibrată exact pentru a domina vizual fără a fi ridicol de mare */}
        <div className="relative mb-8">
          <img
            src={dogImage}
            alt="404 Dog"
            className="w-80 md:w-96 lg:w-[450px] h-auto object-contain drop-shadow-2xl animate-in fade-in zoom-in-95 duration-500"
          />
        </div>

        {/* Tipografie strictă shadcn (fără culori, doar opacități) */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            404 - Pagină inexistentă.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[500px] mx-auto">
            Cățelul-ananas a verificat peste tot, dar adresa pe care o cauți pur și simplu nu se află aici.
          </p>
        </div>

        {/* Butoane - Mai late (min-w-[200px], px-12) și cu FontAwesome */}
        <div className="flex flex-col sm:flex-row gap-6 mt-10 w-full sm:w-auto">
          <Link
            to="/"
            className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-md bg-primary px-12 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <FontAwesomeIcon icon={faHouse} className="mr-3" />
            Acasă
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-md border border-input bg-background px-12 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-3" />
            Înapoi
          </button>
        </div>

      </div>
    </div>
  );
}