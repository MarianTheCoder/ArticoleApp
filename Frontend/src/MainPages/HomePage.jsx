import { useEffect, useRef, useState } from "react";
import "./HomePage.css"; // Asigură-te că ai stilurile pentru carousel și elementele sale
import photoAPI from "../api/photoAPI";
import Logo from '../assets/logo.svg'; // Nu am folosit acest import, dar presupun că este pentru altceva

export default function BalyEnergies() {
  const carouselRef = useRef(null);
  const nextRef = useRef(null);
  const prevRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const slidesData = [
    { title: "Specializați în", number: 1 ,topic: "Electricitate", description: "Lucrări de curenți puternici, lucrări de curenți slabi" },
    { title: "Specializați în", number: 2 ,topic: "Instalații sanitare", description: "Rețele de distribuție" },
    { title: "Specializați în", number: 3 ,topic: "Climatizare", description: "Încălzire, ventilație" },
    { title: "Specializați în", number: 4 ,topic: "Securitate", description: "Sisteme de securitate împotriva incendiilor, sisteme de control al accesului și de intruziune" }
  ];

  useEffect(() => {
    const nextBtn = nextRef.current;
    const prevBtn = prevRef.current;
    const list = carouselRef.current.querySelector('.list');
    const runningTime = carouselRef.current.querySelector('.timeRunning');
    
    const timeRunning = 3000;
    const timeAutoNext = 7000;

    let runTimeOut;
    let runNextAuto = setTimeout(() => {
      nextBtn.click();
    }, timeAutoNext);

    const resetTimeAnimation = () => {
      runningTime.style.animation = 'none';
      runningTime.offsetHeight; // trigger reflow
      runningTime.style.animation = null;
      runningTime.style.animation = 'runningTime 7s linear 1 forwards';
    };
    setLoading(false);
    const showSlider = (type) => {
      const sliderItemsDom = list.querySelectorAll('.carousel .list .item');
      if (type === 'next') {
        list.appendChild(sliderItemsDom[0]);
        carouselRef.current.classList.add('next');
      } else {
        list.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
        carouselRef.current.classList.add('prev');
      }

      clearTimeout(runTimeOut);
      runTimeOut = setTimeout(() => {
        carouselRef.current.classList.remove('next');
        carouselRef.current.classList.remove('prev');
      }, timeRunning);

      clearTimeout(runNextAuto);
      runNextAuto = setTimeout(() => {
        nextBtn.click();
      }, timeAutoNext);

      resetTimeAnimation(); // Reset the running time animation
    };

    nextBtn.onclick = () => showSlider('next');
    prevBtn.onclick = () => showSlider('prev');

    // Start the initial animation 
    resetTimeAnimation();

    return () => {
      clearTimeout(runNextAuto);
      clearTimeout(runTimeOut);
    };
  }, []);
  
    return (
      <div className="carousel" ref={carouselRef}>
        {loading && (
          <div className="absolute w-full h-full bg-white bg-opacity-90 z-50 flex items-center justify-center">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="list">
          {slidesData.map((slide, index) => (
           <div 
           className="item" 
           key={index} 
           style={{ backgroundImage: `url(${photoAPI}/uploads/Principala/img${slide.number}.jpg)` }}>
              <div className="content">
                <div className="title">Specializați în</div>
                <div className="name">{slide.topic}</div>
                <div className="des">{slide.description}</div>
                <div className="btn">
                  <button>See More</button>
                  <button>Subscribe</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="arrows">
          <button className="prev" ref={prevRef}>&lt;</button>
          <button className="next" ref={nextRef}>&gt;</button>
        </div>

        <div className="timeRunning"></div>
      </div>
  );
}
