import React, { useEffect, useState } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';

export default function ListaEchipa() {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.get('/Echipa/api/team')
      .then(res => setTeam(res.data))
      .catch(err => console.error('Eroare la preluarea echipei:', err));
  }, []);

  return (
    <div
      className="
        flex flex-col items-center 
        min-h-screen p-6 
        bg-[linear-gradient(330deg,#0071ca,#0071ca,#000043,#000043)]
      "
    >
      <h2
        className="
          absolute top-5 left-1/2 -translate-x-1/2
          text-3xl font-bold text-white
        "
      >
        Echipa noastră
      </h2>

<div
  className="
    flex flex-wrap justify-center items-stretch
    gap-5 mt-20 ml-20 max-w-[1200px]
  "
>
  {team.map(member => (
    <div
      key={member.id}
      className="
        group                                         /* ← add this */
        relative flex flex-col justify-start 
        w-[280px] p-4 h-auto
        bg-white/10 rounded-lg 
        shadow-[0_5px_15px_rgba(0,0,0,0.2)] 
        transition-transform duration-400 ease-in-out
        hover:-translate-y-2.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]
        overflow-hidden
      "
    >
      <div className="w-full pb-[100%] relative rounded-md overflow-hidden">
        <img
          src={`${photoAPI}/${member.photoUrl}`}
          alt={member.name}
          className="
            absolute inset-0 w-full h-full 
            object-cover rounded-md 
            transition-transform duration-400 ease-in-out
            group-hover:scale-105                   /* ← updated */
          "
        />
      </div>

      <h3 className="mt-4 text-xl font-semibold text-white text-center">
        {member.name}
      </h3>

      <p
        className="
          mt-1 text-base text-gray-300 
          opacity-0 translate-y-5 
          transition-all duration-400 ease-in-out
          group-hover:opacity-100                 /* ← updated */
          group-hover:translate-y-0               /* ← updated */
          text-center
        "
      >
        {member.role}
      </p>

      <div
        className="
          mt-2 p-4 text-sm text-gray-100 
          opacity-0 translate-y-5                 /* fix typo here too */
          transition-all duration-400 ease-in-out
          group-hover:opacity-100                 /* ← updated */
          group-hover:translate-y-0               /* ← updated */
          flex-1 overflow-visible
        "
      >
        {member.description}
      </div>
    </div>
  ))}
</div>
    </div>
  );
}
