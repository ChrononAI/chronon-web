import { Line, Bar, Pie } from "react-chartjs-2";
import "@/lib/chart";
import { formatDate } from "@/lib/utils";

type BackendChartResponse = {
  axis_info: {
    x_axis: string;
    y_axis: string;
  };
  data_points: {
    x_axis: string[];
    y_axis: number[];
  };
  type: "line_graph" | "bar_graph" | "pie_chart";
};

type Props = {
  data: BackendChartResponse;
};

export const isValidDateString = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const isoRegex =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

  if (!isoRegex.test(value)) return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
};

const COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];

export default function CustomChart({ data }: Props) {
  const isPie = data.type === "pie_chart";
    const xAxisLabels = data.data_points?.x_axis?.map((label) => isValidDateString(label) ? formatDate(label) : label);
  const chartData = {
    labels: xAxisLabels,
    datasets: [
      {
        label: data?.axis_info?.y_axis,
        data: data?.data_points?.y_axis,

        borderColor: isPie ? undefined : "#3B82F6",
        backgroundColor: isPie
          ? data?.data_points?.y_axis?.map((_, i) => COLORS[i % COLORS.length])
          : "rgba(59, 130, 246, 0.3)",

        borderWidth: 2,
        tension: 0.3,
        fill: data.type === "line_graph",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text: data?.axis_info?.y_axis,
      },
    },
  };

  if (data.type === "line_graph") {
    return <Line data={chartData} options={options} />;
  }

  if (data.type === "bar_graph") {
    return <Bar data={chartData} options={options} />;
  }

  if (data.type === "pie_chart") {
    return (
      <div className="flex justify-start">
        <div style={{ width: 400, height: 400 }}>
          <Pie data={chartData} options={options} />
        </div>
      </div>
    );
  }

  return null;
}
