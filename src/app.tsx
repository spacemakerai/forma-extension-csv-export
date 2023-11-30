import { Forma } from "forma-embedded-view-sdk/auto";
import { useEffect, useMemo, useState } from "react";

//@ts-ignore
import { FunctionBreakdownMetric } from "forma-embedded-view-sdk/dist/internal/areaMetrics";

const LOCAL_STORAGE_KEY = "parking-demand-extension";
const getLocalStorage = (): Record<string, number> => {
  const value = localStorage.getItem(LOCAL_STORAGE_KEY);
  return value ? JSON.parse(value) : ({} as Record<string, number>);
};

const setLocalStorage = (value: Record<string, number>): void => {
  return localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
};

function round(value: number) {
  return Math.round(value);
}

function SqmPerSpotPerFunction({
  sqm,
  setSqm,
}: {
  sqm: number;
  setSqm: (demand: number) => void;
}) {
  function onInput(event: Event) {
    const { value } = event.target as HTMLInputElement;
    if (isNaN(Number(value))) {
      return;
    }
    setSqm(Number(value));
  }

  return <input onInput={onInput} type="number" value={sqm || 0} />;
}

function Floating() {
  return <p>The floating panel</p>;
}

export function App() {
  const floating = new URLSearchParams(window.location.search).get("floating");
  if (floating) {
    return <Floating />;
  }
  return <RightPanel />;
}

function RightPanel() {
  const [gfaPerFunction, setGfaPerFunction] = useState<
    FunctionBreakdownMetric[]
  >([]);

  const [noOfSpots, setNoOfSpots] = useState<number>(0);

  const totalGfa = useMemo(
    () =>
      gfaPerFunction
        .filter(
          (func) =>
            func.value != "UNABLE_TO_CALCULATE" &&
            func.functionId != "unspecified",
        )
        .reduce((acc, curr) => acc + (curr.value as number), 0),
    [gfaPerFunction],
  );

  const [sqmPerSpotPerFunction, setSqmPerSpotPerFunction] =
    useState<Record<string, number>>(getLocalStorage());

  useEffect(() => {
    Forma.areaMetrics.calculate({}).then((metrics) => {
      const functionBreakdownMetrics =
        metrics.builtInMetrics.grossFloorArea.functionBreakdown.filter(
          (func) => func.functionId != "unspecified",
        );
      setGfaPerFunction(functionBreakdownMetrics);
      const sqmPerSpotPerFunction = Object.fromEntries(
        functionBreakdownMetrics.map((metric) => [metric.functionId, 50]),
      );

      if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        setSqmPerSpotPerFunction(sqmPerSpotPerFunction);
        setLocalStorage(sqmPerSpotPerFunction);
      }
      //@ts-ignore
      setNoOfSpots(metrics.parkingStatistics!.spots);
    });
  }, []);

  const demandPerFunction: Record<string, number> = useMemo(() => {
    const demandPerFunction: Record<string, number> = {};
    gfaPerFunction.forEach((metric) => {
      const sqmPerSpot = sqmPerSpotPerFunction[metric.functionId];
      console.log("sqm per spot input: ", sqmPerSpot);
      if (!sqmPerSpot) {
        demandPerFunction[metric.functionId] = 0;
      } else {
        demandPerFunction[metric.functionId] = round(
          metric.value / sqmPerSpotPerFunction[metric.functionId],
        );
      }
    });
    return demandPerFunction;
  }, [sqmPerSpotPerFunction]);

  function setSqmPerSpotForFunction(
    functionId: string,
  ): (demand: number) => void {
    return function (demand: number) {
      setSqmPerSpotPerFunction((prev) => {
        const newSqmPerSpot = { ...prev, [functionId]: demand };
        setLocalStorage(newSqmPerSpot);
        return { ...prev, [functionId]: demand };
      });
    };
  }

  const totalDemand = useMemo(() => {
    return Object.values(demandPerFunction).reduce(
      (acc, curr) => acc + curr,
      0,
    );
  }, [demandPerFunction]);

  const difference = useMemo(() => {
    return noOfSpots - totalDemand;
  }, [totalDemand, noOfSpots]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Function name</th>
            <th>GFA</th>
            <th>Sqm per spot</th>
            <th>Required spots</th>
          </tr>
        </thead>
        {gfaPerFunction.map((metric) => {
          return (
            <tr>
              <td>{metric.functionName}</td>
              <td>{round(metric.value)}</td>
              <td>
                <SqmPerSpotPerFunction
                  setSqm={setSqmPerSpotForFunction(metric.functionId)}
                  sqm={sqmPerSpotPerFunction[metric.functionId]}
                />
              </td>
              <td>{demandPerFunction[metric.functionId]}</td>
            </tr>
          );
        })}
        <p>Total GFA on site: {round(totalGfa)}</p>
        <p>Total parking spot requirement: {round(totalDemand)} </p>
        <p>Number of parking spots: {noOfSpots}</p>
        <p>
          {difference == 0 && "You have the exact right number of spots."}
          {difference > 0 && `You have a surplus of ${difference} spots.`}
          {difference < 0 &&
            `You need ${difference} more spots to satisfy requirements.`}
        </p>
      </table>
      <button
        onClick={() => {
          return Forma.openFloatingPanel({
            embeddedViewId: "5e00e471-63ed-44a1-8406-cf2ab73408b9",
            url: "https://spacemakerai.github.io/parking-demand-extension/?floating=1",
          });
        }}
      >
        Open settings
      </button>
    </div>
  );
}
