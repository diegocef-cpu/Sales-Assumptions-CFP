import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SatProvider } from "@/context/SatContext";
import Landing from "@/pages/Landing";
import Wizard from "@/pages/Wizard";
import Results from "@/pages/Results";
import BorrowerPage from "@/pages/BorrowerPage";
import LenderDashboard from "@/pages/LenderDashboard";
import InvalidLink from "@/pages/InvalidLink";

const Practice = ({ children }) => <SatProvider>{children}</SatProvider>;

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Practice><Landing /></Practice>} />
          <Route path="/wizard" element={<Practice><Wizard /></Practice>} />
          <Route path="/results" element={<Practice><Results /></Practice>} />
          <Route path="/b/:token" element={<BorrowerPage />} />
          <Route path="/lender" element={<LenderDashboard />} />
          <Route path="*" element={<InvalidLink />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
