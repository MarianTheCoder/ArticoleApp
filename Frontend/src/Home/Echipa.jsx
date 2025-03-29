import React, { useEffect, useState } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';
import './Echipa.css';

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
    <div className="echipa-body">
      <h2 className="echipa-title">Echipa noastra</h2>
      <div className="echipa-container">
        {team.map((member) => (
          <div key={member.id} className="echipa-card">
            <div className="echipa-imgBx">
              <img 
                src={`${photoAPI}/${member.photoUrl}`} 
                alt={member.name} 
              />
            </div>
            <h3 className="echipa-name">{member.name}</h3>
            <p className="echipa-role">{member.role}</p> 
            <div className="echipa-content">
              <p className="echipa-text">{member.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
