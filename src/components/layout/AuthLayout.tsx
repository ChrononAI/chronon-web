function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="w-full flex flex-col lg:flex-row items-stretch p-0">
        <div
          className="w-full lg:w-1/2 flex flex-col justify-center px-12 py-16 min-h-screen relative overflow-hidden"
          style={{ backgroundColor: "#003323" }}
        >
          {/* Middle left content - Value Proposition */}
          <div className="absolute top-1/2 left-12 transform -translate-y-1/2 z-10">
            <div className="text-left max-w-2xl">
              <h1 
                className="text-8xl font-bold leading-[1.1] mb-1 tracking-tight" 
                style={{ 
                  fontFamily: 'Poppins, sans-serif', 
                  color: '#FFFFFF',
                  letterSpacing: '-0.03em',
                  lineHeight: '1.1'
                }}
              >
                Simplifying
              </h1>
              <h1 
                className="text-8xl font-bold leading-[1.1] mb-4 tracking-tight" 
                style={{ 
                  fontFamily: 'Poppins, sans-serif', 
                  color: '#FFFFFF',
                  letterSpacing: '-0.03em',
                  lineHeight: '1.1'
                }}
              >
                Payments
              </h1>
              <p 
                className="text-3xl font-normal text-white/90 tracking-wide" 
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.01em'
                }}
              >
                for <span className="font-bold" style={{ color: '#00D084' }}>Enterprise</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center pt-0 pr-0 pb-8 pl-8 lg:pl-16 min-h-screen bg-white relative overflow-hidden">
          {/* Top far right - Pine Labs text */}
          <div className="absolute top-4 right-4 z-10">
            <p 
              className="text-2xl font-semibold"
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                color: '#003323'
              }}
            >
              pine labs
            </p>
          </div>
          
          {/* Bottom right - powered by CHRONON */}
          <div className="absolute bottom-4 right-4 z-10 text-right">
            <p 
              className="text-sm" 
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                color: '#6b7280'
              }}
            >
              powered by <span className="font-bold" style={{ color: '#2563eb' }}>CHRONON</span>
            </p>
          </div>
          
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
