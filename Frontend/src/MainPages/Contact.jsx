import React, { useEffect, useState } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api';
import api from '../api/axiosAPI';

export default function Prezentare() {

  const [formData, setFormData] = useState({
    latitudine: 47.1690109360525,
    longitudine: 27.594116580043583,
  });

  const handleSend = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await api.post('/email', data);

      if (res.status === 200) {
        alert('Mesaj trimis cu succes!');
        e.target.reset();
      } else {
        alert('Eroare la trimitere.');
      }
    } catch (err) {
      alert('Eroare la conectare cu serverul.');
    }
  };

  return (
    <div className=" w-80% h-full md:text-base text-ms flex flex-col gap-6 text-black pt-10 px-8  pb-6 ">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Poziția 1: Informații contact */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white px-6 py-10 md:px-12 md:py-16  rounded-xl shadow-xl flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Baly Energies</h1>
          <p className="text-lg md:text-xl mb-6">Suntem aici pentru a vă oferi suportul necesar în proiectele de construcții.</p>
          <div className="grid gap-2 text-base md:text-lg">
            <p><span className="font-semibold">Firmă:</span> Baly Energies</p>
            <p><span className="font-semibold">Telefon:</span> +40 753 923 385</p>
            <p><span className="font-semibold">Email:</span> office@balyenergies.fr</p>
            <p><span className="font-semibold">Program:</span> Luni – Vineri, 08:00 – 17:00</p>
          </div>
        </div>

        {/* Poziția 2: Formular email */}
        <div className=" bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a] text-white px-6 py-10 md:px-12 md:py-16 rounded-xl shadow-xl content-center">
          <h2 className="text-2xl font-semibold mb-4">Trimite-ne un mesaj</h2>
          <form onSubmit={handleSend} className="grid gap-4">
            <input type="text" name="name" placeholder="Nume" className="p-3 rounded-lg border text-black border-gray-300" required />
            <input type="email" name="email" placeholder="Email" className="p-3 rounded-lg border text-black border-gray-300" required />
            <input type="text" name="telefon" placeholder="Telefon" className="p-3 rounded-lg border text-black border-gray-300" required />
            <input type="text" name="subiect" placeholder="Subiect" className="p-3 rounded-lg border text-black border-gray-300" required />
            <textarea name="message" rows="4" placeholder="Mesaj" className="p-3 rounded-lg border text-black border-gray-300 resize-none" required></textarea>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium w-fit">Trimite</button>
          </form>
        </div>

        {/* Poziția 3: Adresa România */}
        <div className="flex flex-col w-full h-full gap-4">
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-4 rounded-xl shadow">
            <h2 className="text-lg font-bold">România</h2>
            <p>Bulevardul Constantin Alexandru Rosetti 12, Iași 700141</p>
          </div>
          <div className=" min-h-[30rem] h-full w-full rounded-xl overflow-hidden shadow relative">
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '1rem' }}
              center={{ lat: 47.16898, lng: 27.59397 }}
              zoom={18}
              mapTypeId="hybrid"
            >
              <Marker position={{ lat: 47.16898, lng: 27.59397 }} />
            </GoogleMap>
          </div>
        </div>

        {/* Poziția 4: Adresa Franța */}
        <div className="flex flex-col h-full w-full gap-4">
          <div className="bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a] text-white p-4 rounded-xl shadow">
            <h2 className="text-lg font-bold">Franța</h2>
            <p>15 Rue des Boulins, 77700 Bailly-Romainvilliers</p>
          </div>
          <div className="min-h-[30rem] w-full h-full rounded-xl overflow-hidden shadow relative">
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '1rem' }}
              center={{ lat: 48.85354, lng: 2.82344 }}
              zoom={18}
              mapTypeId="hybrid"
            >
              <Marker position={{ lat: 48.85354, lng: 2.82344 }} />
            </GoogleMap>
          </div>
        </div>

      </div>
    </div>
  );
}