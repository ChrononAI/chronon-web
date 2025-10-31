import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CircleCheck } from 'lucide-react';

export const AccountPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const navigate = useNavigate();

  const isEmailValid = (value: string) => /.+@.+\..+/.test(value);
  const emailHasError = showErrors && !isEmailValid(email);

  const handleSend = () => {
    if (!isEmailValid(email)) {
      setShowErrors(true);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-white'>
      <div className='flex flex-col items-center mb-8'>
        <h1 className='text-4xl font-bold text-blue-500 mb-2'>Chronon</h1>
        <span className="text-3xl font-semibold text-gray-900">Expense Management</span>
      </div>

      <div className="auth-card bg-white shadow-lg rounded-[28px] w-full max-w-xl">
        <div className="content-container p-10">
          <h3 className="title text-md font-bold mb-3">Forgot your password?</h3>
          <p className="sub-title text-gray-600 text-extra-small mb-8">
            Enter the email associated with your Chronon Expense Management account to receive a password reset link.
          </p>

          <form className="form-container" noValidate>
            <div className="email-input-container">
              <div className="label-container mb-2 flex items-center gap-1">
                <div className="input-label text-base text-gray-900 font-semibold">Work email</div>
                <span className="asterisk text-red-600">*</span>
              </div>
              <div className="validation-wrapper relative">
                <input
                  autoComplete="off"
                  name="email"
                  type="email"
                  className={`input-content input-text w-full rounded-lg px-4 h-14 text-base placeholder-gray-400 outline-none border ${(emailHasError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-green-700 focus:ring-2 focus:ring-green-100')}`}
                  placeholder="Enter your work email here"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="error-space h-5" />
                {emailHasError && (
                  <div className="mt-2 text-sm text-red-600">Please enter an email address</div>
                )}
              </div>
            </div>

            <Button
              className="w-full font-semibold mt-6 bg-blue-500 hover:bg-blue-500 h-14 rounded text-white text-lg"
              type="button"
              onClick={handleSend}
            >
              Send reset link
            </Button>

            <div className="my-8 border-b border-gray-300" />

            <div className="alternate-text flex items-center justify-between text-base text-gray-700">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/login')}>
                <span>←</span>
                <div>Know your password? Sign in</div>
              </div>
              <div className="need-help-text">
                Need help? <a href="https://support.chronon.co.in" target="_blank" className="text-green-700 underline hover:text-green-800">Contact support</a>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent className="flex flex-col items-center py-10 pt-5 gap-6 max-w-md text-center">
          <div className="flex justify-center items-center mb-4" style={{ width: 96, height: 96 }}>
            <CircleCheck size={96} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-bold mb-2">Verification request sent to your email ID.</div>
            <div className="text-gray-700 text-lg">Please check your email</div>
          </div>
          <Button className="mt-2 w-40 mx-auto bg-blue-600 hover:bg-blue-700" onClick={() => { setSubmitted(false); navigate('/login'); }}>
            Sign in
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}