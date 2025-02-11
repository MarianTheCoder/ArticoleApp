import React, { useEffect, useState } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI'

export default function ListaEchipa() {
  const [team, setTeam] = useState([]);

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

  return (
    <div className="min-h-screen bg-[#000043] p-6">
      <h2 className="text-3xl font-bold text-center mb-6">Echipa Noastră</h2>
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {team.map((member) => (
    <div key={member.id} className="bg-white rounded-lg shadow-md p-4 text-center relative group">
      <img 
        src={`${photoAPI}/${member.photoUrl}`} 
        alt={member.name} 
        className="w-32 h-32 mx-auto rounded-full object-cover"
      />
      <h3 className="text-gray-600 mt-4 font-bold text-lg">{member.name}</h3>
      
      {/* Descriere și rol care vor apărea doar la hover */}
      <div className="absolute inset-0 bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center p-4 transition-opacity duration-300">
        <p className="text-gray-600">{member.role}</p>
        <p className="text-sm text-gray-500 mt-2">{member.description}</p>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}