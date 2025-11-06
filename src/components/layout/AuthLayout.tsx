function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ backgroundColor: "#F5F7FB" }}
    >
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center p-8">
        <div
          className="w-full lg:w-1/2 flex flex-col justify-center px-12"
          style={{ backgroundColor: "#F5F7FB" }}
        >
          <div className="max-w-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-md">
              <span className="text-white text-3xl font-bold">∞</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-0">
              Chronon
            </h1>
            <h2 className="text-3xl font-bold text-purple-600 mb-2 leading-tight">
              Flow
            </h2>
            <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-md">
              Streamline your business expenses with intelligent automation and
              real-time insights
            </p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Smart Receipt Processing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Real-time Approvals
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Compliance Tracking
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Financial Insights
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center p-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
