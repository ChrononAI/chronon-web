import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from '@/components/layout/AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { products, selectedProduct } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (selectedProduct) {
        if (selectedProduct === "Expense Management") {
          navigate('/expenses');
        } else if (selectedProduct === "Invoice Payments") {
          navigate('/flow/invoice');
        }
      }
      else if (products.length > 1) {
        navigate('/select-product');
      }
      else if (products.length === 1) {
        const product = products[0];
        if (product === "Expense Management") {
          navigate('/expenses');
        } else if (product === "Invoice Payments") {
          navigate('/flow/invoice');
        }
      }
      else {
        navigate('/expenses');
      }
    }
  }, [isAuthenticated, navigate, products, selectedProduct]);

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}