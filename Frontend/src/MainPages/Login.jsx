import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import bgImage from '../assets/Login.jpg'
import Logo from '../assets/BalyLogo.png'

export default function Login() { // Changed 'login' to 'Login' (React component convention)

  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI States
  const [wait, setWait] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWait(true); // Disable button immediately

    const res = await login(email, password);

    // 2. CHECK RESULT
    if (res.success) {
      // SUCCESS
      navigate("/");
    } else {
      // ERROR
      // The Context now returns { success: false, error: "User not found" }
      // So we just read res.error directly.
      toast.error(res.error);
      // Reset UI after 2 seconds
      setTimeout(() => {
        setWait(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-black">
      {/* Secțiunea 1: Fundal */}
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={bgImage}
          alt="Background"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-black/10" />
      </div>

      {/* Mesaj de bun venit (2/3) */}
      <div className="hidden lg:flex lg:w-2/3 relative z-10 flex-col justify-end p-20">
        <div className="max-w-2xl animate-in fade-in slide-in-from-left duration-700">
          <h1 className="text-7xl font-black text-white mb-6 leading-none drop-shadow-2xl">
            VIITORUL <br />
            <span className="text-primary uppercase">Construcțiilor.</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-lg leading-relaxed border-l-[6px] border-primary pl-6">
            Eficiență, precizie și control absolut într-o singură interfață digitală.
          </p>
        </div>
      </div>

      {/* Secțiunea 2: Panoul de Login (1/3) */}
      <div className="w-full lg:w-1/3 relative z-20 flex items-center justify-center bg-black/5 backdrop-blur-2xl border-l border-black shadow-[-50px_0_100px_rgba(0,0,0,0.9)]">
        <img src={Logo} alt="Logo" className="absolute top-8 left-10 h-6 w-auto" />
        <div className="w-full max-w-lg px-10 z-10 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col space-y-10">
            <div className="flex flex-col justify-center">
              <h2 className="text-6xl font-black border-l-8 pl-4 border-primary tracking-tighter text-white">
                Bine ai venit!
              </h2>
              <p className="text-gray-400 text-lg font-medium pt-2">
                Introdu datele de acces.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-bold uppercase tracking-widest text-white ml-1">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 text-lg bg-white/10  text-white placeholder:text-gray-600 
                             focus-visible:ring-none focus-visible:bg-white/15 transition-all 
                             rounded-2xl px-6"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-base font-bold uppercase tracking-widest text-white">
                    Parolă
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-16 text-lg bg-white/10  text-white
                             focus-visible:ring-none focus-visible:bg-white/15 transition-all 
                             rounded-2xl px-6"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-16 text-xl font-black uppercase tracking-widest
                           bg-primary hover:opacity-90 text-primary-foreground
                           shadow-[0_10px_30px_rgba(0,0,0,0.3)] 
                           hover:scale-105 transition-all duration-300 rounded-2xl"
                disabled={wait}
              >
                {wait ? "Se autentifică..." : "Autentificare"}
              </Button>
            </form>

            <footer className="text-sm text-muted-foreground font-medium pt-6 border-t ">
              <span className="text-sm tracking-widest uppercase ">Terminal Securizat</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
