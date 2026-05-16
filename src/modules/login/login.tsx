import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { useAuthStore, ADMIN_PUESTOS } from "@/store/authStore";
import logo from "@/assets/logo.png";

const FIELD_IMAGE = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: any }>("/empleados/login", form);
      if (res.data.success) {
        login(res.data.data);
        const esAdmin = ADMIN_PUESTOS.includes(res.data.data.pstPuesto);
        navigate(esAdmin ? "/" : "/mi-panel");
      } else {
        setError("Credenciales incorrectas");
      }
    } catch {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundColor: "#f0f7f3",
        backgroundImage: "radial-gradient(circle, rgba(45,106,79,0.25) 1.5px, transparent 1.5px)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">

        {/* Lado izquierdo — imagen */}
        <div className="hidden md:block relative overflow-hidden">
          <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(135deg, rgba(15,82,56,0.88) 0%, rgba(45,106,79,0.75) 100%)", mixBlendMode: "multiply" }} />
          <img src={FIELD_IMAGE} alt="Campo agrícola" className="absolute inset-0 w-full h-full object-cover" />
          <div className="relative z-20 h-full flex flex-col justify-between p-12 text-white">
            <div className="flex items-center gap-3">
              <img src={logo} alt="PAD" className="w-9"/>
              <span className="text-2xl font-black tracking-tighter">PAD</span>
            </div>
            <div>
              <h2 className="text-4xl font-extrabold leading-tight mb-4">Gestión precisa para el campo moderno.</h2>
              <p className="text-white/80 text-base leading-relaxed max-w-sm">Optimiza tareas y pagos con la herramienta diseñada para la excelencia agraria.</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-1 w-10 bg-white rounded-full" />
              <div className="h-1 w-2 bg-white/40 rounded-full" />
              <div className="h-1 w-2 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Lado derecho — formulario */}
        <div className="flex flex-col justify-center px-10 py-14 md:px-16">
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logo} alt="PAD" className="w-8 h-8" style={{ filter: "invert(27%) sepia(51%) saturate(500%) hue-rotate(110deg) brightness(60%)" }} />
            <span className="text-xl font-black text-[#0F5238] tracking-tighter">PAD</span>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Bienvenido</h1>
            <p className="text-gray-500 font-medium">Introduce tus credenciales para acceder al portal.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-500 ml-1">Correo electrónico</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#2D6A4F] transition-colors" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input name="email" type="email" placeholder="nombre@tpm-agri.com" value={form.email} onChange={change} required className="w-full pl-11 pr-4 py-4 bg-gray-100 border-0 rounded-xl text-gray-900 text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all placeholder:text-gray-400" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-gray-500">Contraseña</label>
                <a href="#" className="text-xs font-bold text-[#006c48] hover:text-[#2D6A4F] transition-colors">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#2D6A4F] transition-colors" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={change} required className="w-full pl-11 pr-12 py-4 bg-gray-100 border-0 rounded-xl text-gray-900 text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all placeholder:text-gray-400" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer p-0 transition-colors">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-[#2D6A4F] focus:ring-[#2D6A4F] cursor-pointer" />
              <label htmlFor="remember" className="text-sm font-medium text-gray-500 cursor-pointer select-none">Recordar sesión</label>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#0F5238] text-white rounded-xl font-bold text-base border-0 cursor-pointer hover:bg-[#2D6A4F] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-1" style={{ boxShadow: "0 8px 24px rgba(15,82,56,0.25)" }}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              {!loading && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-sm font-medium">¿No tienes una cuenta? <a href="#" className="text-[#006c48] font-bold hover:underline">Contacta con tu administrador</a></p>
          </div>
          <div className="mt-6 flex justify-center gap-6 opacity-40">
            {["Soporte Técnico", "Privacidad", "v1.0.0"].map(t => (
              <span key={t} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}