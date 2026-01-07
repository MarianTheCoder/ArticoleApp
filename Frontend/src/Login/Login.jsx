import React, { useContext, useEffect } from 'react';
import "../assets/login.css";
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

export default function login() {

    const {login} = useContext(AuthContext);
 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [wait, setWait] = useState(false);
    const [message, setMessage] = useState("")

    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        e.preventDefault();
        const res = await login(email, password);
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
    <div className={`text-xl wrapper`}>
    {/* <div
      onClick={() => navigate("/")}
      className="group transition-all duration-500 hover:w-32 absolute cursor-pointer top-4 left-4 w-20 h-12 rounded-full flex justify-center items-center bg-white"
    >
      <FontAwesomeIcon className="relative left-7 transition-all duration-500 group-hover:left-1 text-2xl" icon={faArrowLeft} />
      <p className="text-black ml-2 opacity-0  translate-x-[0px] group-hover:opacity-100  group-hover:translate-x-1 transition-all duration-500">
        Back
      </p>
    </div> */}

    <form onSubmit={handleSubmit} className='login'>
        {/* <h2 className={`border-l-[15px] border-[#ED2939]`} id='txt'>Login</h2> */}
        <div className='inputBox'>
            <input value={email} onChange={(e) => setEmail(e.target.value)}  type="text" placeholder='Email' />
        </div>
        <div className='inputBox'>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder='Password' />
        </div>
        <div className='inputBox flex flex-col gap-4  items-center'>
            <button disabled={wait}  className={` `} type="submit" id="btn">Login</button>
            <p className='text-xl h-1 pt-2  font-bold'>{message}</p>
        </div>
    </form>
    </div>
  )
}
