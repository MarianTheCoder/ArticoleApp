import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo.svg";

export default function BalyEnergies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000043] text-black flex flex-col items-center justify-center p-10">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <img src={logo} alt="Logo" className="h-20" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="text-2xl text-gray-300 max-w-2xl text-center"
      >
        Lider în construcții sustenabile și eficiente energetic. Oferim soluții inovatoare pentru proiecte durabile și performante.
      </motion.p>

      {/* Secțiunea cu serviciile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="mt-10 text-center"
      >
        <h2 className="text-4xl font-bold text-white mb-6">Serviciile Noastre</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="bg-green-800 bg-opacity-50 text-white p-4 rounded-lg shadow-lg"
          >
            <h3 className="text-xl font-semibold">Instalații electrice</h3>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="bg-blue-800 bg-opacity-50 text-white p-4 rounded-lg shadow-lg"
          >
            <h3 className="text-xl font-semibold">Instalații sanitare</h3>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="bg-purple-800 bg-opacity-50 text-white p-4 rounded-lg shadow-lg"
          >
            <h3 className="text-xl font-semibold">Construcții civile</h3>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="bg-yellow-800 bg-opacity-50 text-white p-4 rounded-lg shadow-lg"
          >
            <h3 className="text-xl font-semibold">Mobilă personalizată</h3>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.9, duration: 0.6 }}
        className="mt-10"
      >
        <button 
          onClick={() => navigate("/contact")} 
          className="bg-yellow-400 text-black px-8 py-4 text-2xl font-semibold rounded-lg shadow-lg hover:bg-yellow-500 transition-all"
        >
          Contactează-ne
        </button>
      </motion.div>
    </div>
  );
}
