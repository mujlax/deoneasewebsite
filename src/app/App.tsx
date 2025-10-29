import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AppRoutes } from "./routes";
import styles from "./App.module.css";

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
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
