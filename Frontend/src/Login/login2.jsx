import React, { useContext, useState } from 'react'
import Dropdown from './utils/dropdown'
import { AuthContext } from '../context/TokenContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {

    const {login} = useContext(AuthContext);
 
    const [selectedUser, selectUser] = useState("Angajat");
    const [color, isColor] = useState(0);
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [wait, setWait] = useState(false);
    const [message, setMessage] = useState("")

    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        console.log(selectedUser , name, password);
        e.preventDefault();
        const res = await login(name, password, selectedUser);
        if(res){
            setMessage(res.response?.data?.message);
            setWait(true);
            setTimeout(() => {
                setMessage("");
                setWait(false);
            }, 2000);
        }
        else navigate("/");
    }

  return (
    <div className=' flex justify-center items-center'>
        <div className='bg-gray-600 w-1/3 h-auto rounded-xl flex justify-center'>
            <form action="" className='grid grid-rows-[auto_1fr] w-full '>
                <div className='w-full flex justify-center'>
                    {/* <Dropdown selected = {selectedUser} select = {selectUser} color = {color} isColor = {isColor}/> */}
                </div>
                <div className='flex flex-col items-center justify-between w-full'>
                    <div className='w-full flex text-xl flex-col gap-6 items-center'>
                        <h1 className='text-4xl'>Login</h1>
                        <div className='flex w-full flex-col px-12'>
                            <label htmlFor="" className=' ml-1 mb-2'>Nume</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className={` border w-full  ${color == 0 ? "border-emerald-500 " : color == 1 ? "border-blue-600 " : "border-amber-500 "} px-4 bg-gray-800 outline-none rounded-xl h-16`} type="text" />
                        </div>
                        <div className='flex w-full flex-col px-12'>
                            <label htmlFor="" className='mb-2 ml-1'>Parola</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={` border w-ful ${color == 0 ? "border-emerald-500 " : color == 1 ? "border-blue-600 " : "border-amber-500 "} px-4 bg-gray-800 outline-none rounded-xl h-16`}  />
                        </div>
                    </div>
                    <p className='text-xl p-2 pt-4 h-12 font-bold'>{message}</p>
                    <button disabled={wait} className={`m-4 mb-8  p-4 bg-gray-800 border rounded-xl text-xl px-8 font-bold ${color == 0 ? "border-emerald-500 text-emerald-500" : color == 1 ? "border-blue-600 text-blue-600" : "border-amber-500 text-amber-500"}  `} onClick={(e) => handleSubmit(e)}>Login</button>
                </div>
            </form>
          
        </div>
    </div>
  )
}
