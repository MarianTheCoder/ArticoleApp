import React, { useState, useEffect } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';
import "../assets/customCSS.css";

export default function Echipa() {
  const [team, setTeam] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');
  const [editingMember, setEditingMember] = useState(null);

  // Preluarea echipei la încărcarea paginii
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get('/Echipa/api/team');
        setTeam(response.data);
      } catch (error) {
        console.error('Eroare la preluarea echipei:', error);
      }
    };

    fetchTeam();
  }, []);

  // Trimiterea formularului pentru adăugarea unui membru
  const handleFileChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('description', description);
    formData.append('photo', photo);

    try {
      const response = await api.post('/Echipa/api/team', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage(response.data.message);
      setName('');
      setRole('');
      setDescription('');
      setPhoto(null);
      setTeam((prevTeam) => [
        ...prevTeam,
        {
          id: response.data.id,
          name,
          role,
          description,
          photoUrl: response.data.photoUrl,
        },
      ]);
    } catch (error) {
      setMessage('Eroare la adăugare. Verifică consola.');
      console.error('Eroare:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/Echipa/api/team/${id}`);
      setTeam(team.filter((member) => member.id !== id));
      alert(response.data.message);
    } catch (error) {
      console.error('Eroare la ștergerea membrului:', error);
      alert('Eroare la ștergerea membrului');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setName(member.name);
    setRole(member.role);
    setDescription(member.description);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingMember) {
      const updatedMember = {
        ...editingMember,
        name,
        role,
        description,
      };
      try {
        await api.put(`/Echipa/api/team/${editingMember.id}`, updatedMember);
        setTeam((prevTeam) =>
          prevTeam.map((member) =>
            member.id === editingMember.id ? updatedMember : member
          )
        );
        setEditingMember(null);
        setMessage('Membru actualizat cu succes!');
      } catch (error) {
        setMessage('Eroare la actualizarea membrului');
        console.error('Eroare:', error);
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="containerZ w-2/3 h-90h relative flex flex-col items-center rounded-lg">
        <div className="w-full relative h-full gap-2 rounded-xl flex flex-col overflow-hidden p-5 py-8">
          <div className="min-h-screen bg-[#000043] flex flex-col items-center justify p-6">
            <h2 className="text-3xl font-bold mb-6 text-white">
              {editingMember ? 'Editează Membru' : 'Adaugă un Membru în Echipa'}
            </h2>

            <form
              className="bg-white p-5 rounded-lg shadow-md w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr] max-h-36"
              onSubmit={editingMember ? handleSaveEdit : handleSubmit}
              encType="multipart/form-data"
            >
          <div className="max-h-36 flex items-center">
  {/* Div pentru imagine */}
  <div
    className="w-16 h-16 flex justify-center items-center cursor-pointer rounded-full border-2 border-gray-300 overflow-hidden"
    onClick={() => document.getElementById('file-input').click()} // Deschide selectorul de fișiere la click
  >
    {/* Previzualizarea imaginii */}
    {photo ? (
      <img
        src={URL.createObjectURL(photo)} // Arată imaginea selectată
        alt="Preview"
        className="w-full h-full object-cover"
      />
    ) : (
      <span className="text-gray-400">Adaugă imagine</span> // Text de fallback dacă nu există o imagine
    )}
  </div>

  {/* Input de fișier ascuns */}
  <input
    type="file"
    id="file-input"
    className="hidden"
    onChange={handleFileChange}
    accept="image/*"
  />
</div>

              <div className="max-h-36">
                <input
                  type="text"
                  placeholder="Nume"
                  className="text-black w-full p-3 border rounded max-h-36"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="">
                <input
                  type="text"
                  placeholder="Rol"
                  className="text-black w-full p-3 border rounded"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>
              <div className="max-h-36">
                <textarea
                  placeholder="Descriere"
                  className="text-black w-full p-3 border rounded min-h-12 max-h-12"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center justify-center">
                <button
                  type="submit"
                  className="w-full sm:w-auto p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingMember ? 'Salvează Modificările' : 'Adaugă Membru'}
                </button>
              </div>
            </form>

            {message && <p className="mt-4 text-center text-green-600">{message}</p>}

            <h2 className="text-3xl font-bold mb-6 text-white">Echipa Noastră</h2>
            <div className="w-full max-w-4xl">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-white p-6 mb-4 rounded-lg shadow-lg"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={`${photoAPI}/${member.photoUrl}`}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-black">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.role}</p>
                      <p className="text-sm text-gray-500 mt-2">{member.description}</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleEdit(member)}
                      className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-2"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
