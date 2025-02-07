import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Echipa() {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/team');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {team.length > 0 ? (
          team.map((member) => (
            <div key={member.id} className="bg-white p-4 shadow-md rounded-lg text-center">
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-32 h-32 mx-auto rounded-full object-cover mb-4"
              />
              <h3 className="text-xl font-semibold">{member.name}</h3>
              <p className="text-gray-600">{member.role}</p>
              <p className="mt-2 text-gray-500">{member.description}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-3">Nu există membri în echipă.</p>
        )}
      </div>
    </div>
  );
}
