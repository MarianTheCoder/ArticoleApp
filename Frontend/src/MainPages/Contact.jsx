import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000043] text-white flex flex-col items-center justify-center p-10">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-6xl font-bold mb-8"
      >
        Contactează-ne
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="text-2xl text-gray-300 max-w-2xl text-center mb-6"
      >
        Ne poți contacta folosind informațiile de mai jos:
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="text-xl text-gray-300 space-y-4"
      >
        <p><strong>Telefon:</strong> +33 (0)1 64 18 04 48</p>
        <p><strong>Email:</strong> contact@balyenergies.com</p>
        <p><strong>Adresă:</strong> 15 Rue des Boulins
        77700 Bailly-Romainvilliers</p>
      </motion.div>

      <motion.button
        onClick={() => navigate("/")}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-10 bg-yellow-400 text-black px-8 py-4 text-2xl font-semibold rounded-lg shadow-lg hover:bg-yellow-500 transition-all"
      >
        Înapoi la Acasă
      </motion.button>
    </div>
  );
}