import React, { useState } from 'react';
import axios from 'axios';

export default function AddEchipa() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/team', {
        name,
        role,
        photoUrl,
        description,
      });

      setMessage(response.data.message);
      setName('');
      setRole('');
      setPhotoUrl('');
      setDescription('');
    } catch (error) {
      setMessage('Eroare la adăugare. Verifică consola.');
      console.error('Eroare:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#000043] flex flex-col items-center justify-center p-6">
      <h2 className="text-3xl font-bold mb-6">Adaugă un Membru în Echipa</h2>
      <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-md" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nume"
          className="w-full p-3 mb-4 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Rol"
          className="w-full p-3 mb-4 border rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="URL Poză"
          className="w-full p-3 mb-4 border rounded"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          required
        />
        <textarea
          placeholder="Descriere"
          className="w-full p-3 mb-4 border rounded"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
        <button type="submit" className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700">
          Adaugă Membru
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </div>
  );
}
