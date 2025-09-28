import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  CardSubtitle,
} from "@progress/kendo-react-layout";
import { Button } from "@progress/kendo-react-buttons";
import {
  Chart,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartTooltip,
} from "@progress/kendo-react-charts";
import type { OperationLog } from "../types";

interface DashboardProps {
  logs: OperationLog[];
  onClear: () => void;
}

// Kendo React bar chart (uses free Kendo React chart component)
const KendoBarChart = ({
  data,
  categories,
  title,
}: {
  data: number[];
  categories: string[];
  title: string;
}) => {
  // Kendo Chart expects arrays for series data; keep the UI container sizing stable with tailwind classes
  return (
    <div className="h-full min-h-0 flex flex-col">
      <h3 className="text-base font-semibold text-center text-gray-200 mb-4">
        {title}
      </h3>
      <div className="flex-grow min-h-0">
        <Chart className="h-full">
          <ChartCategoryAxis>
            <ChartCategoryAxisItem
              categories={categories}
              labels={{ rotation: -45, margin: 8, skip: 0 }}
            />
          </ChartCategoryAxis>
          <ChartSeries>
            <ChartSeriesItem type="column" data={data} />
          </ChartSeries>
          <ChartTooltip format="{0} ops" />
        </Chart>
      </div>
    </div>
  );
};

// Custom simple list for top nodes
const TopNodesList = ({
  data,
  title,
}: {
  data: { category: string; value: number }[];
  title: string;
}) => (
  <div className="h-full flex flex-col">
    <h3 className="text-base font-semibold text-center text-gray-200 mb-4">
      {title}
    </h3>
    <ul className="space-y-2 px-4">
      {data.map((item) => (
        <li
          key={item.category}
          className="flex justify-between items-center text-sm"
        >
          <span className="text-gray-300 truncate pr-2" title={item.category}>
            {item.category}
          </span>
          <span className="font-semibold text-indigo-300 bg-gray-700 px-2 py-0.5 rounded-md">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ logs, onClear }) => {
  const summaryStats = useMemo(() => {
    const successfulOps = logs.filter((log) => log.status === "success");
    return {
      totalOps: successfulOps.length,
      totalCost: successfulOps.reduce((sum, log) => sum + log.cost, 0),
      totalCredits: successfulOps.reduce((sum, log) => sum + log.credits, 0),
      uniqueImages: new Set(successfulOps.map((log) => log.imageName)).size,
    };
  }, [logs]);

  const opsByDay = useMemo(() => {
    const groups = logs.reduce(
      (acc, log) => {
        const date = new Date(log.timestamp).toLocaleDateString("en-CA"); // YYYY-MM-DD format
        if (!acc[date]) acc[date] = 0;
        if (log.status === "success") acc[date]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const categories: string[] = [];
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStringCA = d.toLocaleDateString("en-CA");
      categories.push(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      );
      data.push(groups[dateStringCA] || 0);
    }
    return { categories, data };
  }, [logs]);

  const topNodesUsed = useMemo(() => {
    const usage = logs.reduce(
      (acc, log) => {
        if (log.status === "success") {
          acc[log.nodeName] = (acc[log.nodeName] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(usage)
      .map(([name, count]) => ({ category: name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Show top 7
  }, [logs]);

  const sortedLogs = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((log) => ({ ...log, timestamp: new Date(log.timestamp) })),
    [logs],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-200">Dashboard</h2>
        <Button icon="delete" onClick={onClear} disabled={logs.length === 0}>
          Clear Log Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="!bg-gray-800 border border-gray-700">
          <CardHeader>
            <CardTitle className="!text-gray-300">Total Operations</CardTitle>
            <CardSubtitle className="!text-gray-400">
              Successful Edits
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <p className="text-4xl font-bold text-indigo-400">
              {summaryStats.totalOps}
            </p>
          </CardBody>
        </Card>
        <Card className="!bg-gray-800 border border-gray-700">
          <CardHeader>
            <CardTitle className="!text-gray-300">
              Unique Images Processed
            </CardTitle>
            <CardSubtitle className="!text-gray-400">
              Distinct Source Files
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <p className="text-4xl font-bold text-indigo-400">
              {summaryStats.uniqueImages}
            </p>
          </CardBody>
        </Card>
        <Card className="!bg-gray-800 border border-gray-700">
          <CardHeader>
            <CardTitle className="!text-gray-300">Simulated Credits</CardTitle>
            <CardSubtitle className="!text-gray-400">Total Used</CardSubtitle>
          </CardHeader>
          <CardBody>
            <p className="text-4xl font-bold text-indigo-400">
              {summaryStats.totalCredits}
            </p>
          </CardBody>
        </Card>
        <Card className="!bg-gray-800 border border-gray-700">
          <CardHeader>
            <CardTitle className="!text-gray-300">Estimated Cost</CardTitle>
            <CardSubtitle className="!text-gray-400">
              Based on Operations
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <p className="text-4xl font-bold text-indigo-400">
              ${summaryStats.totalCost.toFixed(4)}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[300px] min-h-0">
        <Card className="lg:col-span-3 !bg-gray-800 border border-gray-700">
          <CardBody className="h-full min-h-0 p-4">
            <KendoBarChart
              data={opsByDay.data}
              categories={opsByDay.categories}
              title="Operations Per Day (Last 7 Days)"
            />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2 !bg-gray-800 border border-gray-700">
          <CardBody className="h-full min-h-0 p-4">
            <TopNodesList data={topNodesUsed} title="Top Nodes Used" />
          </CardBody>
        </Card>
      </div>

      <Card className="!bg-gray-800 border border-gray-700">
        <CardHeader>
          <CardTitle className="!text-gray-300">Operations Log</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            className="overflow-y-auto rounded-lg border border-gray-700"
            style={{ height: "450px" }}
          >
            {sortedLogs.length > 0 ? (
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/75 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3"
                      style={{ width: "220px" }}
                    >
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Image Name
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Node Used
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3"
                      style={{ width: "120px" }}
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right"
                      style={{ width: "120px" }}
                    >
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        {log.timestamp.toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td
                        className="px-4 py-2 truncate max-w-xs"
                        title={log.imageName}
                      >
                        {log.imageName}
                      </td>
                      <td
                        className="px-4 py-2 truncate max-w-xs"
                        title={log.nodeName}
                      >
                        {log.nodeName}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${log.status === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-right">
                        {log.cost.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 4,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-300">
                    No operation logs
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Run a workflow to see logs here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Dashboard;
