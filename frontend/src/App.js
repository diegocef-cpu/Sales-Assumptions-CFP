import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SatProvider } from "@/context/SatContext";
import Landing from "@/pages/Landing";
import Wizard from "@/pages/Wizard";
import Results from "@/pages/Results";

function App() {
  return (
    <SatProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </SatProvider>
  );
}

export default App;
