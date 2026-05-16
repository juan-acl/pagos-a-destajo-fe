export default function Dashboard() {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 m-0">Dashboard BI</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reporte ejecutivo de pagos, producción y cuadrillas.
        </p>
      </div>

      {/* iframe Power BI */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
           style={{ minHeight: "calc(100vh - 160px)" }}>
        <iframe
          title="PBI PAD"
          width="100%"
          height="100%"
          src="https://app.powerbi.com/view?r=eyJrIjoiM2ZmMjc0NjctNjg3MC00ZDc3LTgxZjMtNGIwMTcyNDgzMjU1IiwidCI6IjVmNTNiNGNlLTYzZDQtNGVlOC04OGQyLTIyZjBiMmQ0YjI3YSIsImMiOjR9"
          frameBorder="0"
          allowFullScreen
          style={{ display: "block", minHeight: "calc(100vh - 160px)" }}
        />
      </div>
    </div>
  );
}
