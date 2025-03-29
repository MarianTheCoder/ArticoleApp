import { useEffect, useRef } from "react";
import "./HomePage.css";

export default function BalyEnergies() {
  const slideRef = useRef(null);

  const nextSlide = () => {
    if (slideRef.current) {
      let items = slideRef.current.children;
      slideRef.current.appendChild(items[0]); // Mută primul element la sfârșit
    }
  };

  const prevSlide = () => {
    if (slideRef.current) {
      let items = slideRef.current.children;
      slideRef.current.prepend(items[items.length - 1]); // Mută ultimul element la început
    }
  };

  return (
    <div className="HP-container">
      <div className="HP-slide" ref={slideRef}>
        {[
          { name: "Switzerland", img: "https://i.ibb.co/qCkd9jS/img1.jpg" },
          { name: "Finland", img: "https://i.ibb.co/jrRb11q/img2.jpg" },
          { name: "Iceland", img: "https://i.ibb.co/NSwVv8D/img3.jpg" },
          { name: "Australia", img: "https://i.ibb.co/Bq4Q0M8/img4.jpg" },
          { name: "Netherland", img: "https://i.ibb.co/jTQfmTq/img5.jpg" },
          { name: "Ireland", img: "https://i.ibb.co/RNkk6L0/img6.jpg" },
        ].map((item, index) => (
          <div
            key={index}
            className="HP-item"
            style={{ backgroundImage: `url(${item.img})` }}
          >
            <div className="HP-content">
              <div className="HP-name">{item.name}</div>
              <div className="HP-des">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ab, eum!
              </div>
              <button>See More</button>
            </div>
          </div>
        ))}
      </div>

      <div className="HP-button">
        <button className="HP-prev" onClick={prevSlide}>
          ◀️
        </button>
        <button className="HP-next" onClick={nextSlide}>
          ▶️
        </button>
      </div>
    </div>
  );
}
