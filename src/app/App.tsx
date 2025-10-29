import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AppRoutes } from "./routes";
import styles from "./App.module.css";

// Базовый путь для GitHub Pages
const basename = import.meta.env.BASE_URL;

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter basename={basename}>
        <div className={styles.app}>
          <Header />
          <main className={styles.main}>
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
