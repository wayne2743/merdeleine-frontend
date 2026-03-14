import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// customer pages
import SellWindowListPage from "./pages/customer/SellWindowListPage";
import SellWindowDetailPage from "./pages/customer/SellWindowDetailPage";
import MyOrdersPage from "./pages/customer/MyOrdersPage";
import PaymentPage from "./pages/customer/PaymentPage";
import CustomerProductsPage from "./pages/customer/CustomerProductsPage";

// admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import SellWindowAdminPage from "./pages/admin/SellWindowAdminPage";
import ConfirmBatchPage from "./pages/admin/ConfirmBatchPage";
import ProductionPage from "./pages/admin/ProductionPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/customer/sell-windows" replace />} />

        {/* Customer */}
        <Route path="/customer/sell-windows" element={<SellWindowListPage />} />
        <Route path="/customer/sell-windows/:productSellWindowId" element={<SellWindowDetailPage />} />
        <Route path="/customer/orders" element={<MyOrdersPage />} />
        <Route path="/customer/orders/:orderId/payment" element={<PaymentPage />} />
        <Route path="/customer/products" element={<CustomerProductsPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/sell-windows" element={<SellWindowAdminPage />} />
        <Route path="/admin/confirm" element={<ConfirmBatchPage />} />
        <Route path="/admin/production" element={<ProductionPage />} />

        <Route path="*" element={<div style={{ padding: 16 }}>404 Not Found</div>} />
      </Route>
    </Routes>
  );
}