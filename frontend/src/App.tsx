import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import ProjectsPage from "./pages/Projects";
import AnalyzePage from "./pages/Analyze";
import CrawlerPage from "./pages/Crawler";
import CrawlDetailPage from "./pages/CrawlDetail";

function Nav() {
  const { pathname } = useLocation();
  return (
    <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
      <NavLink to="/projects" active={pathname === "/projects"}>
        Projects
      </NavLink>
      <NavLink to="/analyze" active={pathname.startsWith("/analyze")}>
        Analyze URL
      </NavLink>
      <NavLink to="/crawler" active={pathname === "/crawler"}>
        Site Crawler
      </NavLink>
    </nav>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      style={{
        padding: "0.4rem 0.8rem",
        borderRadius: "0.375rem",
        textDecoration: "none",
        fontWeight: 500,
        color: active ? "#fff" : "#374151",
        backgroundColor: active ? "#2563eb" : "#f3f4f6",
      }}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <BrowserRouter>
      <main
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem" }}>News SEO Platform</h1>
        <Nav />
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/crawler" element={<CrawlerPage />} />
          <Route path="/crawls/:id" element={<CrawlDetailPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
