import { useEffect, useRef, useState } from "react";
import "./HomePage.css";
import photoAPI from "../api/photoAPI";
import Logo from '../assets/logo.svg';

export default function BalyEnergies() {
  const carouselRef = useRef(null);
  const nextRef = useRef(null);
  const prevRef = useRef(null);
  const [autoSlide, setAutoSlide] = useState(null);

  const slidesData = [
    { title: "Specializați în", topic: "Electricitate", description: "Lucrări de curenți puternici, lucrări de curenți slabi" },
    { title: "Specializați în", topic: "Instalații sanitare", description: "Rețele de distribuție" },
    { title: "Specializați în", topic: "Climatizare", description: "Încălzire, ventilație" },
    { title: "Specializați în", topic: "Securitate", description: "Sisteme de securitate împotriva incendiilor, sisteme de control al accesului și de intruziune" }
  ];

  useEffect(() => {
    const nextDom = nextRef.current;
    const prevDom = prevRef.current;
    const carouselDom = carouselRef.current;
    const sliderDom = carouselDom.querySelector(".HP-list");
    const thumbnailBorderDom = carouselDom.querySelector(".HP-thumbnail");
    let thumbnailItemsDom = thumbnailBorderDom.querySelectorAll(".HP-item");

    thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);

    const interval = setInterval(() => {
      nextDom.click();
    }, 7000);
    setAutoSlide(interval);

    return () => clearInterval(interval);
  }, []);

  function showSlider(type) {
    const carouselDom = carouselRef.current;
    const sliderDom = carouselDom.querySelector(".HP-list");
    const thumbnailBorderDom = carouselDom.querySelector(".HP-thumbnail");
    const sliderItemsDom = sliderDom.querySelectorAll(".HP-item");
    const thumbnailItemsDom = thumbnailBorderDom.querySelectorAll(".HP-item");

    if (carouselDom.classList.contains("HP-next") || carouselDom.classList.contains("HP-prev")) {
      return;
    }

    if (type === "next") {
      carouselDom.classList.add("HP-next");
      setTimeout(() => {
        sliderDom.appendChild(sliderItemsDom[0]);
        thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
        carouselDom.classList.remove("HP-next");
      }, 500);
    } else {
      carouselDom.classList.add("HP-prev");
      setTimeout(() => {
        sliderDom.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
        thumbnailBorderDom.prepend(thumbnailItemsDom[thumbnailItemsDom.length - 1]);
        carouselDom.classList.remove("HP-prev");
      }, 500);
    }
  }

  return (
    <div className="HP-body">
      <div className="HP-carousel" ref={carouselRef} style={{ height: "100vh" }}>
        <div className="HP-list">
          {slidesData.map((slide, index) => (
            <div className="HP-item" key={index} style={{ height: "100vh" }}>
              <img src={`${photoAPI}/uploads/Principala/img${index + 1}.jpg`} alt={`Slide ${index + 1}`} style={{ height: "100%" }} />
              <div className="HP-content">
                <img src={Logo} alt="Website Logo" className="HP-author" />
                <div className="HP-title">{slide.title}</div>
                <div className="HP-topic">{slide.topic}</div>
                <div className="HP-description">{slide.description}</div>
                <div className="HP-buttons">
                  <button>SEE MORE</button>
                  <button>SUBSCRIBE</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="HP-thumbnail">
          {slidesData.map((slide, index) => (
            <div className="HP-item" key={index}>
              <img src={`${photoAPI}/uploads/Principala/img${index + 1}.jpg`} alt={`Thumbnail ${index + 1}`} />
              <div className="HP-content">
                <div className="HP-title">{slide.title}</div>
                <div className="HP-description">{slide.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="HP-arrows">
          <button id="HP-prev" ref={prevRef} onClick={() => showSlider("prev")}>&#9665;</button>
          <button id="HP-next" ref={nextRef} onClick={() => showSlider("next")}>&#9655;</button>
        </div>
      </div>
    </div>
  );
}
