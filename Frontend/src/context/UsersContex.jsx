import React, { createContext, useEffect, useState } from 'react'
import api from '../api/axiosAPI'

const AngajatiContext = createContext();

const UsersProvider = ({ children }) => {

    const [editAngajat, setEditAngajat] = useState(null);

    const [confirmDel, setConfirmDel] = useState(null);
    const [clicked, setClicked] = useState(null);
    const [angajati, setAngajati] = useState(null);

    useEffect(() => {
        if(clicked != null){
            setAngajati(null);
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

    const deleteAngajat = async (id,e) =>{
        e.preventDefault();
        try {
            const response = await api.post(`/users/DeleteUser/${id}`);
            console.log(response.data);
            await getAngajati();
            setConfirmDel(null);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <AngajatiContext.Provider value={{ clicked, setClicked, angajati, setAngajati , getAngajati, deleteAngajat, confirmDel, setConfirmDel, editAngajat, setEditAngajat }}>
            {children}
        </AngajatiContext.Provider>
    );
}

export {AngajatiContext, UsersProvider};
