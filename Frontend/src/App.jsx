import { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/TokenContext';
import Login from './Login/Login.jsx';
import RoutesDOM from './RoutesDom.jsx';
import ProtectedRouteAfterLogin from './MainElements/ProtectedRouteAfterLogin.jsx'
import { LoadScript } from '@react-google-maps/api';
import { LoadingProvider } from './context/LoadingContext.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from "./components/ui/sonner"

// 1. IMPORTURILE NECESARE
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 2. CONFIGURAREA CLIENTULUI (pentru CRM)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datele sunt considerate "proaspete" timp de 1 minut. 
      // Daca userul schimba tab-ul si revine in < 1 min, nu face request la server (ia din cache).
      staleTime: 1000 * 60 * 1,
      // Daca vrei sa nu faca refetch cand dai click inapoi pe fereastra (optional, bun in dev)
      refetchOnWindowFocus: true,
      // Reincearca de 1 data daca pica netul, nu de 3 ori (default)
      retry: 1,
    },
  },
});

function App() {
  return (
    <div className='w-full h-full scrollbar-webkit scrollbar-thin'>
      <LoadScript googleMapsApiKey="AIzaSyCDs0sewwk9xpKKexCOhem7yCPicxef5gY">
        <ThemeProvider defaultTheme="light">
          {/* 3. PROVIDER-UL WRAPPER */}
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <LoadingProvider>
                  <Routes>
                    <Route path="/login" element={<ProtectedRouteAfterLogin ><Login /></ProtectedRouteAfterLogin>} />
                    <Route path='*' element={<RoutesDOM />} />
                  </Routes>
                </LoadingProvider>
              </AuthProvider>
            </BrowserRouter>

            {/* Devtools apare doar in development */}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />

          </QueryClientProvider>
        </ThemeProvider>
      </LoadScript>
      <Toaster
        expand={true}
        position="bottom-right"
        richColors={true}
        toastOptions={{
          style: { fontSize: '1.2rem', minWidth: '36rem' },
        }}
      />
    </div>
  );
}

export default App;