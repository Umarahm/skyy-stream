import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type FifaLoadingContextValue = {
  loading: boolean;
  report: (id: string, loading: boolean) => void;
};

const FifaLoadingContext = createContext<FifaLoadingContextValue>({
  loading: false,
  report: () => {},
});

// One overlay, fed by whichever FIFA tab is currently mounted — keyed by id
// so a page swap (unmount + mount) can't get stuck showing "loading: true"
// from a component that's already gone.
export const FifaLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const report = useMemo(
    () => (id: string, loading: boolean) =>
      setLoadingMap((prev) => (prev[id] === loading ? prev : { ...prev, [id]: loading })),
    [],
  );

  const loading = Object.values(loadingMap).some(Boolean);

  return <FifaLoadingContext.Provider value={{ loading, report }}>{children}</FifaLoadingContext.Provider>;
};

export const useFifaLoadingState = (): boolean => useContext(FifaLoadingContext).loading;

// Safe to call from a component that isn't wrapped in a FifaLoadingProvider —
// `report` defaults to a no-op, so this is a harmless no-op there too.
export const useReportFifaLoading = (id: string, loading: boolean) => {
  const { report } = useContext(FifaLoadingContext);
  useEffect(() => {
    report(id, loading);
    return () => report(id, false);
  }, [id, loading, report]);
};
