import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

export default function Layout() {
  return (
    <div>
      <NavBar />
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 16,
          color: "#f4efdf",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}