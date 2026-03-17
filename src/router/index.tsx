import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const PositionWorkerModule = lazy(
  () => import("@/modules/positionWorker/positionWorker"),
);

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/position" element={<PositionWorkerModule />} />
      </Routes>
    </BrowserRouter>
  );
}
