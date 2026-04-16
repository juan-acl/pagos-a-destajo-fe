import { useState, useEffect, type PropsWithChildren } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Map, FileText, Users, Grid2x2, Link2, Briefcase,
  ClipboardList, Search, Package, Settings, LogOut, Menu, X, ChevronLeft,
  LayoutDashboard, Ruler, GitMerge, ScrollText,
} from "lucide-react";
import { useAuthStore, isAdmin } from "@/store/authStore";
import logo from "@/assets/logo.png";

const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 64;
const MOBILE_BREAK = 768;

export default function AppShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAK);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, empleado } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAK;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = isMobile ? 0 : collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;
  const showSidebar = isMobile ? mobileOpen : true;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initiales = empleado
    ? `${empleado.primerNombre[0]}${empleado.primerApellido[0]}`
    : "??";

  const adminLinks = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/medidas", label: "Medidas", icon: Ruler },
    { to: "/ordenes-trabajo", label: "Órdenes de Trabajo", icon: ScrollText },
    { to: "/areas", label: "Áreas", icon: Map },
    { to: "/planillas", label: "Planillas", icon: FileText },
    { to: "/empleados", label: "Empleados", icon: Users },
    { to: "/cuadrillas", label: "Cuadrillas", icon: Grid2x2 },
    { to: "/miembros-cuadrilla", label: "Miembros de cuadrilla", icon: Link2 },
    { to: "/puestos", label: "Posiciones", icon: Briefcase },
    { to: "/asignaciones-orden-cuadrilla", label: "Asignaciones Orden", icon: GitMerge },
    { to: "/employee-assignment", label: "Asignaciones", icon: ClipboardList },
    { to: "/production-review", label: "Revisiones", icon: Search },
    { to: "/production-lot", label: "Lotes", icon: Package },
  ];

  const operarioLinks = [
    { to: "/mi-panel", label: "Mi Panel", icon: LayoutDashboard },
  ];

  const links = isAdmin(empleado?.pstPuesto) ? adminLinks : operarioLinks;

  const footerLinks = [
    { icon: Settings, label: "Settings", action: () => {} },
    { icon: LogOut, label: "Logout", action: handleLogout },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100svh", background: "#F8F9FA" }}>

      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 150 }} />
      )}

      {showSidebar && (
        <aside style={{
          width: isMobile ? SIDEBAR_FULL : collapsed ? SIDEBAR_MINI : SIDEBAR_FULL,
          minHeight: "100svh",
          background: "#fff",
          borderRight: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          zIndex: 200,
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}>

          {/* Logo */}
          <div style={{
            padding: "20px 16px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "space-between",
            minHeight: "64px",
          }}>
            {(!collapsed || isMobile) && (
              <img src={logo} style={{ filter: "invert(1)", width: "36px" }} alt="logo" />
            )}
            {!isMobile && (
              <button
                onClick={() => setCollapsed(p => !p)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronLeft size={18} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
            )}
            {isMobile && (
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "4px" }}>
                <X size={20} />
              </button>
            )}
          </div>

          <nav style={{ padding: "12px 8px", flex: 1, overflowY: "auto" }}>
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to + label}
                to={to}
                end={to === "/"}
                onClick={() => isMobile && setMobileOpen(false)}
                title={collapsed && !isMobile ? label : undefined}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed && !isMobile ? 0 : "10px",
                  justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                  padding: collapsed && !isMobile ? "10px" : "9px 12px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#2D6A4F" : "#6B7280",
                  background: isActive ? "rgba(45,106,79,0.08)" : "transparent",
                  marginBottom: "2px",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                    {(!collapsed || isMobile) && <span>{label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "12px 8px", borderTop: "1px solid #E2E8F0" }}>
            {(!collapsed || isMobile) && empleado && (
              <div style={{ padding: "10px 12px", marginBottom: "8px", background: "#F8F9FA", borderRadius: "8px", fontSize: "12px" }}>
                <p style={{ fontWeight: 600, color: "#1A202C", margin: 0 }}>{empleado.primerNombre} {empleado.primerApellido}</p>
                <p style={{ color: "#9CA3AF", margin: "2px 0 0", fontSize: "11px" }}>{empleado.email}</p>
              </div>
            )}
            {footerLinks.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                title={collapsed && !isMobile ? label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed && !isMobile ? 0 : "10px",
                  justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                  width: "100%",
                  padding: collapsed && !isMobile ? "10px" : "9px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: label === "Logout" ? "#DC3545" : "#6B7280",
                  marginBottom: "2px",
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                {(!collapsed || isMobile) && <span>{label}</span>}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Main */}
      <div style={{
        marginLeft: isMobile ? 0 : sidebarWidth,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        transition: "margin-left 0.2s ease",
        minWidth: 0,
      }}>
        {/* Topbar */}
        <header style={{
          height: "56px",
          background: "#fff",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "4px", display: "flex" }}>
                <Menu size={22} />
              </button>
            )}
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#1A202C" }}>Pago a destajo</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {empleado && (
              <span style={{ fontSize: "13px", color: "#6B7280" }}>
                {empleado.primerNombre} {empleado.primerApellido}
              </span>
            )}
            <div
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "#2D6A4F", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700, cursor: "pointer",
              }}
            >
              {initiales}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: isMobile ? "16px" : "28px 32px", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}