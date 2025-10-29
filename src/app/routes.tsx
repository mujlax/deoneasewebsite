import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/Home/Home";
import { NewsPage } from "@/pages/News/News";
import { NewsEditorPage } from "@/pages/News/Editor/NewsEditor";
import { ContactsPage } from "@/pages/Contacts/Contacts";
import { NewsArticlePage } from "@/pages/News/NewsArticle";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/news/editor" element={<NewsEditorPage />} />
      <Route path="/news/:slug" element={<NewsArticlePage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
