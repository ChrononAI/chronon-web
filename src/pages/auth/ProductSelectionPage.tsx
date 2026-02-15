import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { IndianRupee, FileText } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";

export function ProductSelectionPage() {
  const navigate = useNavigate();
  const { products, selectedProduct, setSelectedProduct, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (selectedProduct) {
      navigateToProduct(selectedProduct);
      return;
    }
    
    if (products.length === 1) {
      setSelectedProduct(products[0]);
      navigateToProduct(products[0]);
      return;
    }
    
    if (products.length === 0) {
      navigate("/login");
      return;
    }
  }, [products, selectedProduct, isAuthenticated, navigate, setSelectedProduct]);

  const navigateToProduct = (product: string) => {
    if (product === "Expense Management") {
      navigate("/expenses");
    } else if (product === "Invoice Payments") {
      navigate("/flow/invoice");
    }
  };

  const handleProductSelect = (product: string) => {
    setSelectedProduct(product);
    navigateToProduct(product);
  };

  const getProductIcon = (product: string) => {
    if (product === "Expense Management") {
      return <IndianRupee className="w-12 h-12 text-blue-600" />;
    } else if (product === "Invoice Payments") {
      return <FileText className="w-12 h-12 text-purple-600" />;
    }
    return null;
  };

  const getProductDescription = (product: string) => {
    if (product === "Expense Management") {
      return "Manage your expenses, reports, advances, and pre-approvals";
    } else if (product === "Invoice Payments") {
      return "Manage invoice payments, vendors, and approvals";
    }
    return "";
  };

  if (products.length === 0 || products.length === 1) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Product</h2>
          <p className="text-gray-600 text-base">
            Choose which product you'd like to access
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <button
              key={product}
              onClick={() => handleProductSelect(product)}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">{getProductIcon(product)}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                  {product}
                </h3>
                <p className="text-sm text-gray-600">
                  {getProductDescription(product)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}

