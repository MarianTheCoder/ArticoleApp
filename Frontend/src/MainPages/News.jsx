import React, { useEffect, useState } from 'react';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';
import '../assets/News.css';

export default function ListaEchipa() {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await api.get('/News/api/news');
        setTeam(response.data);
      } catch (error) {
        console.error('Eroare la preluarea stirilor:', error);
      }
    };

    fetchTeam();
  }, []);

  return (
    
    <div className="news-container">
      <h2 className="news-title">News</h2>
      <div className="news-container1">
        {team.map((member) => (
          <div key={member.id} className="news-card">
            <div className="news-imgBx">
              <img 
                src={`${photoAPI}/${member.photoUrl}`} 
                alt={member.name} 
              />
            </div>
            <h3 className="news-name">{member.name}</h3>
            <div className="news-content">
              <p className="news-text">{member.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
