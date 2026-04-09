export type Option = { id: number; nombre: string };

type FiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  filterValue: string;
  setFilterValue: (value: string) => void;
  filterEstado: string;
  setFilterEstado: (value: string) => void;
  options?: Option[];
  placeholder: string;
  label1: string;
  label2: string;
  options2?: Option[];
};

const Filters = (props: FiltersProps) => {
  const {
    search,
    setSearch,
    filterValue,
    setFilterValue,
    filterEstado,
    setFilterEstado,
    options,
    placeholder,
    label1,
    label2,
    options2,
  } = props;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
      <input
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
      />
      {options && (
        <select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white"
        >
          <option value="">{label1}: Todos</option>
          {options?.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}
      {options2 && (
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white"
        >
          <option value="">{label2}: Todos</option>
          {options2?.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default Filters;
