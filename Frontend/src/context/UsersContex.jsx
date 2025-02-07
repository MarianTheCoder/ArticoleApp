import React, { createContext, useEffect, useState } from 'react'
import api from '../api/axiosAPI'

const AngajatiContext = createContext();

const UsersProvider = ({ children }) => {


    const [clicked, setClicked] = useState(null);
    const [angajati, setAngajati] = useState(null);

    useEffect(() => {
        if(clicked != null){
            getAngajati();
        }
    }, [clicked]);
    

    const getAngajati = async () =>{
        const role = ["ofertant", "angajat", "beneficiar"];
        try {
            const response = await api.post("/users/GetUsers", {role:role[clicked-1]});
            console.log(response.data);
            setAngajati(response.data);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <AngajatiContext.Provider value={{ clicked, setClicked, angajati, setAngajati }}>
            {children}
        </AngajatiContext.Provider>
    );
}

export {AngajatiContext, UsersProvider};
