import LoginPage from "./Components/LoginPage";
import GalleryPage from "./Components/Gallery";
import "./index.css";
import { Routes, Route } from "react-router-dom";
import SignUp from "./Components/SignUp";
import ChoicePage from "./Components/ChoicePage";
import PublicGallery from "./Components/PublicGallery";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ChoicePage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/view" element={<PublicGallery />} />
        <Route path="/gallerypage" element={<GalleryPage />} />
        <Route path="signuppage" element={<SignUp />} />
      </Routes>
    </>
  );
}

export default App;
