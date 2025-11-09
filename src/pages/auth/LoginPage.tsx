import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from '@/components/layout/AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/expenses');
    }
  }, [isAuthenticated, navigate]);

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}