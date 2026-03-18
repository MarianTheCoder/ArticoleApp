import React, { useContext } from "react";
import { Routes, Route, useLocation, Outlet } from "react-router-dom";
import Navbar from "./MainElements/Navbar";
import ProtectedRoute from "./MainElements/ProtectedRoute";
// import NavbarDefaultHome from './MainElements/NavbarDefaultHome';
import DatabaseMainCategories from "./BazaDeDate/DatabaseMainCategories";
import RetetaForm from "./BazaDeDate/Retete/RetetaForm";
import { AuthContext } from "./context/TokenContext";
import SantiereRoutes from "./BazaDeDate/Santiere/SantiereRoutes";
import { useEffect } from "react";
import NoPage from "./MainElements/NoPage";
import Pontaje from "./BazaDeDate/Pontaje/Pontaje";
import AtribuiriActivitate from "./BazaDeDate/Pontaje/Deprecated/AtribuiriActivitate";
import Dashboard from "./CRM/Dashboard";
import CompaniesMainPage from "./CRM/Companies/CompaniesMainPage";
import CompanyView from "./CRM/Companies/CompanyView";
import FilialaView from "./CRM/Filiale/FilialaView";
import FilialeMainCompany from "./CRM/Filiale/FilialeMainCompany";
import FilialaMainPage from "./CRM/Filiale/FilialaMainPage";
import SantiereMainPage from "./CRM/Santiere/SantiereMainPage";
import ContactsMainPage from "./CRM/Contacts/ContactsMainPage";
import { useLoading } from "./context/LoadingContext";
import UtilizatoriMainPage from "./CRM/Utilizatori/UtilizatoriMainPage";
import CompaniiInterneMainPage from "./CRM/Companii Interne/CompaniiInterneMainPage";
import LandingPage from "./MainPages/LandingPage";

function AppLayout() {
  // This layout only renders when a valid child route matches.
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function RoutesDom() {
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);
  const { show, hide } = useLoading();

  useEffect(() => {
    if (loading) {
      show();
    } else {
      hide();
    }
  }, [loading]);

  if (loading) return <></>;

  return (
    <div className=" grid h-screen text-white  w-full relative grid-cols-1">
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path=""
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="CRM"
            element={
              <ProtectedRoute
                module="companii"
                friendlyName="a accesa Dashboard"
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="CRM/Companii"
            element={
              <ProtectedRoute
                module="companii"
                friendlyName="a accesa Companiile"
              >
                <CompaniesMainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="CRM/Companii/View/:companyId"
            element={
              <ProtectedRoute
                module="companii"
                friendlyName="a accesa detaliile companiei"
              >
                <CompanyView />
              </ProtectedRoute>
            }
          />

          <Route
            path="CRM/Filiale"
            element={
              <ProtectedRoute
                module="filiale"
                friendlyName="a accesa Filialele"
              >
                <FilialaMainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="CRM/Filiale/View/:companyId/:filialaId"
            element={
              <ProtectedRoute
                module="filiale"
                friendlyName="a accesa detaliile filialei"
              >
                <FilialaView />
              </ProtectedRoute>
            }
          />

          <Route
            path="CRM/Santiere"
            element={
              <ProtectedRoute
                module="santiere"
                friendlyName="a accesa Șantierele"
              >
                <SantiereMainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="Santiere/:limbaUser/:idCompanie/:idSantier"
            element={
              <ProtectedRoute
                module="santiere"
                friendlyName="a accesa detaliile șantierului"
              >
                <SantiereRoutes />
              </ProtectedRoute>
            }
          />

          <Route
            path="CRM/Contacte"
            element={
              <ProtectedRoute
                module="contacte"
                friendlyName="a accesa Contactele"
              >
                <ContactsMainPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="addArticles"
            element={
              <ProtectedRoute module="retete" friendlyName="a accesa articole">
                <RetetaForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="addManopere"
            element={
              <ProtectedRoute
                module="manopere"
                friendlyName="a accesa manopere"
              >
                <DatabaseMainCategories dateType={1} />
              </ProtectedRoute>
            }
          />
          <Route
            path="addMateriale"
            element={
              <ProtectedRoute
                module="materiale"
                friendlyName="a accesa materiale"
              >
                <DatabaseMainCategories dateType={2} />
              </ProtectedRoute>
            }
          />
          <Route
            path="addTransport"
            element={
              <ProtectedRoute
                module="transport"
                friendlyName="a accesa transport"
              >
                <DatabaseMainCategories dateType={3} />
              </ProtectedRoute>
            }
          />
          <Route
            path="addUtilaje"
            element={
              <ProtectedRoute module="utilaje" friendlyName="a accesa utilaje">
                <DatabaseMainCategories dateType={4} />
              </ProtectedRoute>
            }
          />

          <Route
            path="Pontaje"
            element={
              <ProtectedRoute module="pontaje" friendlyName="a accesa Pontaje">
                <Pontaje />
              </ProtectedRoute>
            }
          />
          {/* <Route path="AtribuiriActivitate" element={<ProtectedRoute module="pontaje" friendlyName="a accesa Atribuiri Activitate"><AtribuiriActivitate /></ProtectedRoute>} /> */}

          <Route
            path="ManageConturi"
            element={
              <ProtectedRoute
                module="conturi"
                friendlyName="a gestiona conturile"
              >
                <UtilizatoriMainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="Companii-interne"
            element={
              <ProtectedRoute
                module="conturi"
                friendlyName="a accesa Companiile Interne"
              >
                <CompaniiInterneMainPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NoPage />} />
      </Routes>
    </div>
  );
}
