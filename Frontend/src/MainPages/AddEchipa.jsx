import React, { useState } from 'react';
import api from '../api/axiosAPI';

export default function AddEchipa() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setPhoto(e.target.files[0]); // Stocăm fișierul selectat
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('description', description);
    formData.append('photo', photo); // Adăugăm imaginea

    try {
      const response = await api.post('Echipa/api/team', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Header specific pentru fișiere
      });

      setMessage(response.data.message);
      setName('');
      setRole('');
      setDescription('');
      setPhoto(null);
    } catch (error) {
      setMessage('Eroare la adăugare. Verifică consola.');
      console.error('Eroare:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#000043] flex flex-col items-center justify-center p-6">
      <h2 className="text-3xl font-bold mb-6">Adaugă un Membru în Echipa</h2>
      <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-md" onSubmit={handleSubmit} encType="multipart/form-data">
        <input
          type="text"
          placeholder="Nume"
          className="text-black w-full p-3 mb-4 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Rol"
          className="text-black w-full p-3 mb-4 border rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <textarea
          placeholder="Descriere"
          className="text-black w-full p-3 mb-4 border rounded"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
        
        {/* Input pentru fișier */}
        <input type="file" className="mb-4" onChange={handleFileChange} required />

        <button type="submit" className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700">
          Adaugă Membru
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </div>
  );
}
