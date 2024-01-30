import { Forma } from "forma-embedded-view-sdk/auto";
import { useCallback, useEffect, useState } from "react";

//@ts-ignore
import { FunctionBreakdownMetric } from "forma-embedded-view-sdk/dist/internal/areaMetrics";

let csvHeader = "data:text/csv;charset=utf-8,Metric name;Total Value";
let gfa = "GFA";
let buildingCoverage = "Building Coverage";
let siteArea = "Site Area";
let unitCount = "Number of units";

export function App() {
  const [metrics, setMetrics] = useState<any>();
  useEffect(() => {
    Forma.areaMetrics.calculate({}).then((theMetrics) => {
      console.log("theMetrics", theMetrics);
      setMetrics(theMetrics);
      siteArea = siteArea + ";" + theMetrics.builtInMetrics.siteArea.value;
      unitCount = unitCount + ";" + theMetrics.unitStatistics.count.value;
      const totalGfa =
        theMetrics.builtInMetrics.grossFloorArea.functionBreakdown.reduce(
          (totalGfa, { value }) => {
            if (value === "UNABLE_TO_CALCULATE") return totalGfa;
            return value + totalGfa;
          },
          0,
        );
      gfa = gfa + ";" + totalGfa;
      buildingCoverage =
        buildingCoverage +
        ";" +
        theMetrics.builtInMetrics.buildingCoverage.value;
      theMetrics.builtInMetrics.grossFloorArea.functionBreakdown.forEach(
        ({ functionName, value }) => {
          csvHeader = csvHeader + ";" + (functionName || "Unnamed function");
          gfa = gfa + ";" + value;
        },
      );
    });
  }, []);

  const onClick = useCallback(() => {
    const csvUri = encodeURI(
      csvHeader +
        "\r\n" +
        gfa +
        "\r\n" +
        buildingCoverage +
        "\r\n" +
        siteArea +
        "\r\n" +
        unitCount,
    );
    window.open(csvUri);
  }, [metrics]);

  return (
    <div class="wrapper">
      <p class="header">CSV export</p>
      <weave-button onClick={onClick}>Download CSV</weave-button>
    </div>
  );
}
