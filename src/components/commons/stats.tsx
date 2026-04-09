type StatsProps = {
  data: { label: string; value: number; color: string }[];
};

const Stats = (props: StatsProps) => {
  const { data } = props;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {data.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {stat.label}
          </p>
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default Stats;
