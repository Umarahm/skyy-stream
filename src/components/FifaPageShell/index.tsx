import { ReactNode } from "react";
import SportsShell from "@/components/SportsShell";
import FifaSubNav from "@/components/FifaSubNav";
import FifaLoadingOverlay from "@/components/FifaLoadingOverlay";
import { FifaLoadingProvider } from "@/Utils/FifaLoadingContext";

const FifaPageShell = ({ children }: { children: ReactNode }) => {
  return (
    <FifaLoadingProvider>
      <FifaLoadingOverlay />
      <SportsShell>
        <FifaSubNav />
        {children}
      </SportsShell>
    </FifaLoadingProvider>
  );
};

export default FifaPageShell;
