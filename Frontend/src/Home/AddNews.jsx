import React, { useState, useEffect } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';

export default function News() {
  const [team, setTeam] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');

  // Preluarea echipei la încărcarea paginii
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get('/News/api/news');
        setTeam(response.data);
      } catch (error) {
        console.error('Eroare la preluarea stirei:', error);
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
    formData.append('description', description);
    formData.append('photo', photo);

    try {
      const response = await api.post('/News/api/news', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage(response.data.message);
      setName('');
      setDescription('');
      setPhoto(null);
      setTeam((prevTeam) => [
        ...prevTeam,
        {
          id: response.data.id,
          name,
          description,
          photoUrl: response.data.photoUrl,
        },
      ]);
    } catch (error) {
      setMessage('Eroare la adăugare. Verifică consola.');
      console.error('Eroare:', error);
    }
  };

  // Ștergerea unui membru
  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/News/api/news/${id}`);
      setTeam(team.filter((member) => member.id !== id));
      alert(response.data.message);
    } catch (error) {
      console.error('Eroare la ștergerea stirei:', error);
      alert('Eroare la ștergerea stirei');
    }
  };

  return (
    <div className='h-screen flex items-center justify-center'>
    <div className="containerZ  w-2/3 h-90h relative flex flex-col items-center rounded-lg">
    <div className="w-full relative h-full  gap-2 rounded-xl flex flex-col overflow-hidden p-5 py-8">
                 {/* FetchedArticles */}
                 <div className="h-full grid grid-rows-1 w-full scrollbar-webkit overflow-hidden">
    <div className="min-h-screen bg-[#000043] flex flex-col items-center justify p-6">
      <h2 className="text-3xl font-bold mb-6 text-white">Adaugă</h2>

      <form
  className="bg-white p-5 rounded-lg shadow-md w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr] max-h-36"
  onSubmit={handleSubmit}
  encType="multipart/form-data"
>
  <div className="">
  
    
    <input
      type="text"
      placeholder="Nume"
      className="text-black w-full p-3 border rounded"
      value={name}
      onChange={(e) => setName(e.target.value)}
      required
    />
  </div>
  <div className=" max-h-36">
    <textarea
      placeholder="Descriere"
      className="text-black w-full p-3 border rounded min-h-12 max-h-12"
      rows="3"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      required
    ></textarea>
  </div>
  <div className="">
    <input
      type="file"
      className=" top-0 right-0 bg-gray-500 text-white rounded-full p-2 m-2 "
      onChange={handleFileChange}
      required
    />
  </div>
  <div className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center justify-end">
    <button
      type="submit"
      className="w-full sm:w-auto p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Adaugă Membru
    </button>
  </div>
</form>


 {/* Formularul de adăugare membru */}
    
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}

      {/* Lista echipei */}
      <h2 className="text-3xl font-bold mb-6 text-white">News</h2>
      <div className="w-full max-w-4xl">
        {team && team.map((member) => (
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
                <p className="text-sm text-gray-500 mt-2">{member.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(member.id)}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Șterge
            </button>
          </div>
        ))}
      </div>
    </div>
    </div>
    </div>
    </div>
    </div>
  );
}

