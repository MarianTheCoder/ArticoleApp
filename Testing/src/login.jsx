import React from 'react';
import "./assets/login.css";
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function login() {

    const [selectedUser, setSelectedUser] = useState(0);

    // const {login} = useContext(AuthContext);
 
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [wait, setWait] = useState(false);
    const [message, setMessage] = useState("")

    // const navigate = useNavigate();

    const handleSubmit = async (e) =>{
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
    <div className={`${selectedUser == 0 ? "bg-[#16A34A]" : selectedUser == 1 ? "bg-[#F97316]" : "bg-[#2563EB]"} wrapper`}>
    <div onClick={() => navigate("/")} className=' absolute cursor-pointer  top-2 left-2 w-12 h-12 rounded-full flex justify-center items-center bg-white'><FontAwesomeIcon className='relative text-xl' icon={faArrowLeft} /></div>
    <div className='login'>
        <h2 className={`border-l-15 ${selectedUser == 0 ? "border-l-[#16A34A]" : selectedUser == 1 ? "border-l-[#F97316]" : "border-l-[#2563EB]"}`} id='txt'>Login</h2>
        <div className='inputBox'>
            <input value={name} onChange={(e) => setName(e.target.value)}  type="text" placeholder='Username' />
        </div>
        <div className='inputBox'>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder='Password' />
        </div>
        <div className='inputBox'>
            <input disabled={wait}  className={`${selectedUser == 0 ? "bg-[#16A34A]" : selectedUser == 1 ? "bg-[#F97316]" : "bg-[#2563EB]"} `} type="submit"  value="Login" id="btn"/>
        </div>
    </div>
    <div className='colors'>
        <span onClick={() => setSelectedUser(0)} className={selectedUser == 0 ? "active" : ""} style={{"--clr":"#16A34A"}}>Angajat</span>
        <span onClick={() => setSelectedUser(1)} className={selectedUser == 1 ? "active" : ""} style={{"--clr":"#F97316"}}>Beneficiar</span>
        <span onClick={() => setSelectedUser(2)} className={selectedUser == 2 ? "active" : ""} style={{"--clr":"#2563EB "}}>Ofertant</span>
    </div>
    <p className='text-xl p-2 pt-4 h-12 font-bold'>{message}</p>

    </div>
  )
}
