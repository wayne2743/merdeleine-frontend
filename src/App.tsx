import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// customer pages
import SellWindowListPage from "./pages/customer/SellWindowListPage";
import SellWindowDetailPage from "./pages/customer/SellWindowDetailPage";
import MyOrdersPage from "./pages/customer/MyOrdersPage";
import PaymentPage from "./pages/customer/PaymentPage";
import CustomerProductsPage from "./pages/customer/CustomerProductsPage";
import HomePage from "./pages/HomePage.tsx";

// admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ConfirmBatchPage from "./pages/admin/ConfirmBatchPage";
import ProductionPage from "./pages/admin/ProductionPage";
import ProductAdminPage from "./pages/admin/ProductAdminPage";
import PaymentAdminPage from "./pages/admin/PaymentAdminPage";
import SellWindowCrudPage from "./pages/admin/SellWindowCrudPage";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allow={["USER"]} />}>
            <Route path="/customer/products" element={<CustomerProductsPage />} />
            <Route path="/customer/sell-windows" element={<SellWindowListPage />} />
            <Route path="/customer/sell-windows/:productSellWindowId" element={<SellWindowDetailPage />} />
            <Route path="/customer/orders" element={<MyOrdersPage />} />
            <Route path="/customer/orders/:orderId/payment" element={<PaymentPage />} />
          </Route>

          <Route element={<RequireRole allow={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<ProductAdminPage />} />
            <Route path="/admin/payments" element={<PaymentAdminPage />} />
            <Route path="/admin/sell-window-crud" element={<SellWindowCrudPage />} />
            <Route path="/admin/confirm" element={<ConfirmBatchPage />} />
            <Route path="/admin/production" element={<ProductionPage />} />
            <Route path="/admin/production-planning" element={<ProductionPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}