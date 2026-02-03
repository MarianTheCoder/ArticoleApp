import React, { useContext, useState } from 'react';
import "../assets/login.css";
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

export default function Login() { // Changed 'login' to 'Login' (React component convention)

  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI States
  const [wait, setWait] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWait(true); // Disable button immediately

    // 1. CALL LOGIN
    // IMPORTANT: Passed '0' as 3rd arg because Context expects a role index.
    // 0 = Angajat, 1 = Beneficiar, 2 = Ofertant
    const res = await login(email, password, 0);

    // 2. CHECK RESULT
    if (res.success) {
      // SUCCESS
      navigate("/");
    } else {
      // ERROR
      // The Context now returns { success: false, error: "User not found" }
      // So we just read res.error directly.
      setMessage(res.error);

      // Reset UI after 2 seconds
      setTimeout(() => {
        setMessage("");
        setWait(false);
      }, 2000);
    }
  };

  return (
    <div className="text-xl wrapper">
      <form onSubmit={handleSubmit} className='login'>
        {/* Inputs */}
        <div className='inputBox'>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            placeholder='Email'
            required // HTML5 validation
          />
        </div>
        <div className='inputBox'>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder='Password'
            required
          />
        </div>

        {/* Submit & Error Message */}
        <div className='inputBox flex flex-col gap-4 items-center'>
          <button
            disabled={wait}
            className="cursor-pointer" // Add styling as needed
            type="submit"
            id="btn"
          >
            {wait ? "Se verifică..." : "Login"}
          </button>

          {/* Error Display */}
          <p className='text-xl text-black h-1 pt-2 font-bold'>{message}</p>
        </div>
      </form>
    </div>
  );
}