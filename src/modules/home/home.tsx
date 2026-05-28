import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "@/api";
import Badge from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

type Empleado = { id: number; estado: string; };
type Cuadrilla = { id: number; estado: string; };
type Lote = { id: number; numeroLote: string; totalPiezasAprobadas: number; fechaEnvio: string; estado: string; };
type Asignacion = { id: number; metaIndividual: number; estado: string; cuadrillaId: number; };
type Planilla = { id: number; numeroPago: number; montoTotal: number; metodoPago: string; estado: string; fechaPago: string; };

const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);
const fetchLotes = () => api.get<{ data: Lote[] }>("/production-lot").then(r => r.data.data);
const fetchAsignaciones = () => api.get<{ data: Asignacion[] }>("/employee-assignment").then(r => r.data.data);
const fetchPlanillas = () => api.get<{ data: Planilla[] }>("/planilla", { params: { limit: 10 } }).then(r => r.data.data);

const links = [
  { label: "Empleados", to: "/empleados", icon: "👤", desc: "Gestiona la fuerza laboral" },
  { label: "Cuadrillas", to: "/cuadrillas", icon: "👥", desc: "Grupos de trabajo" },
  { label: "Miembros", to: "/miembros-cuadrilla", icon: "🔗", desc: "Asignación a cuadrillas" },
  { label: "Asignaciones", to: "/employee-assignment", icon: "📌", desc: "Meta individual por cuadrilla" },
  { label: "Revisiones", to: "/production-review", icon: "🔍", desc: "Control de producción" },
  { label: "Lotes", to: "/production-lot", icon: "📦", desc: "Lotes de producción enviados" },
  { label: "Planillas", to: "/planillas", icon: "💰", desc: "Pagos a destajo" },
  { label: "Áreas", to: "/areas", icon: "🗺", desc: "Áreas de trabajo" },
  { label: "Posiciones", to: "/puestos", icon: "💼", desc: "Puestos de trabajo" },
];

const COLORS = ["#2D6A4F", "#52B788", "#E9C46A", "#F4A261", "#DC3545"];

export default function Home() {
  const { data: empleados = [] } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });
  const { data: lotes = [] } = useQuery({ queryKey: ["lotes"], queryFn: fetchLotes });
  const { data: asignaciones = [] } = useQuery({ queryKey: ["asignaciones"], queryFn: fetchAsignaciones });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });

  const empleadosActivos = empleados.filter(e => e.estado === "ACTIVO").length;
  const cuadrillasActivas = cuadrillas.filter(c => c.estado === "ACTIVO").length;
  const totalPiezas = lotes.filter(l => l.estado === "APROBADO").reduce((sum, l) => sum + l.totalPiezasAprobadas, 0);
  const lotesAprobados = lotes.filter(l => l.estado === "APROBADO").length;
  const pagosPagados = planillas.filter(p => p.estado === "PAGADO").length;

  const stats = [
    { label: "Empleados activos", value: empleadosActivos, total: `de ${empleados.length} total`, color: "text-[#2D6A4F]", bg: "bg-green-50", border: "border-green-100" },
    { label: "Cuadrillas activas", value: cuadrillasActivas, total: `de ${cuadrillas.length} total`, color: "text-[#2D6A4F]", bg: "bg-green-50", border: "border-green-100" },
    { label: "Piezas aprobadas", value: totalPiezas.toLocaleString(), total: `${lotesAprobados} lotes`, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Pagos realizados", value: pagosPagados, total: `de ${planillas.length} planillas`, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  ];

  // Datos para gráfico de barras — piezas por lote
  const barData = lotes
    .filter(l => l.estado === "APROBADO")
    .map(l => ({ name: `#${l.numeroLote}`, piezas: l.totalPiezasAprobadas }))
    .sort((a, b) => b.piezas - a.piezas)
    .slice(0, 8);

  // Datos para gráfico de dona — estado de lotes
  const estadosLote = lotes.reduce((acc, l) => {
    acc[l.estado] = (acc[l.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(estadosLote).map(([name, value]) => ({ name, value }));

  const lotesRecientes = [...lotes]
    .sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 m-0">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general del sistema de pagos a destajo.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-xl p-5`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.total}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Barras — piezas por lote */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Piezas aprobadas por lote</h2>
          <p className="text-xs text-gray-400 mb-4">Lotes con estado APROBADO</p>
          {barData.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px" }}
formatter={(value) => [Number(value).toLocaleString(), "Piezas"]}
                />
                <Bar dataKey="piezas" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Dona — estado de lotes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Estado de lotes</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución por estado</p>
          {pieData.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lotes y Planillas recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Lotes recientes</h2>
            <Link to="/production-lot" className="text-xs text-[#2D6A4F] font-medium hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {lotesRecientes.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">Sin lotes registrados</p>
            ) : lotesRecientes.map(lote => (
              <div key={lote.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Lote #{lote.numeroLote}</p>
                  <p className="text-xs text-gray-400">{lote.totalPiezasAprobadas.toLocaleString()} piezas · {lote.fechaEnvio}</p>
                </div>
                <Badge label={lote.estado} color={lote.estado === "APROBADO" ? "green" : "amber"} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Planillas recientes</h2>
            <Link to="/planillas" className="text-xs text-[#2D6A4F] font-medium hover:underline">Ver todas →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {planillas.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">Sin planillas registradas</p>
            ) : planillas.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Planilla #{p.numeroPago}</p>
                  <p className="text-xs text-gray-400">{p.metodoPago} · Q{p.montoTotal.toLocaleString()}</p>
                </div>
                <Badge label={p.estado} color={p.estado === "PAGADO" ? "green" : p.estado === "RECHAZADO" ? "red" : "amber"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Accesos rápidos</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 divide-x divide-y divide-gray-100">
          {links.map(link => (
            <Link key={link.to} to={link.to} className="flex flex-col gap-2 p-5 hover:bg-gray-50 transition-colors no-underline">
              <span className="text-2xl">{link.icon}</span>
              <p className="text-sm font-semibold text-gray-900 m-0">{link.label}</p>
              <p className="text-xs text-gray-400 m-0">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}