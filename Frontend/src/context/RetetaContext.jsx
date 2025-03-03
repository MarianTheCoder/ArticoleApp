import React, { createContext, useEffect, useState } from "react";
import api from '../api/axiosAPI'


const RetetaContext = createContext();


const RetetaProvider = ({ children }) => {

    const [manopereSelected, setManopereSelected] = useState([]);
    const [materialeSelected, setMaterialeSelected] = useState([]);
    const [transportSelected, setTransportSelected] = useState([]);
    const [utilajeSelected, setUtilajeSelected] = useState([]);

  return (
    <RetetaContext.Provider value={{setManopereSelected, manopereSelected, materialeSelected, setMaterialeSelected, transportSelected, setTransportSelected, utilajeSelected, setUtilajeSelected}}>
      {children}
    </RetetaContext.Provider>
  );
};

export { RetetaContext, RetetaProvider };
