import { Forma } from "forma-embedded-view-sdk/auto";
import { useCallback, useEffect, useState } from "react";

//@ts-ignore
import { FunctionBreakdownMetric } from "forma-embedded-view-sdk/dist/internal/areaMetrics";

let csvHeader = "data:text/csv;charset=utf-8,Metric name;Value";
const line = "1;2;3;4;5;6";

export function App() {
  const [metrics, setMetrics] = useState<any>();
  useEffect(() => {
    Forma.areaMetrics.calculate({}).then((theMetrics) => {
      setMetrics(theMetrics);
      theMetrics.builtInMetrics.grossFloorArea.functionBreakdown.forEach(
        ({ functionName }) => {
          csvHeader = csvHeader + ";" + (functionName || "Unamed function");
        },
      );
    });
  }, []);

  const onClick = useCallback(() => {
    const csvUri = encodeURI(csvHeader + "\r\n" + line);
    window.open(csvUri);
  }, [metrics]);

  return (
    <div class="wrapper">
      <p class="header">CSV export</p>
      <weave-button onClick={onClick}>Download CSV</weave-button>
    </div>
  );
}
