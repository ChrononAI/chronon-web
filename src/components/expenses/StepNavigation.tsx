
import { Check } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  isManualEntry?: boolean;
}

export function StepNavigation({ currentStep, totalSteps, stepTitles, isManualEntry = false }: StepNavigationProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stepTitles.map((title, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isGrayedOut = isManualEntry && stepNumber === 1;
         

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Step Circle */}
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    ${isGrayedOut
                      ? 'bg-gray-300 text-gray-500'
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent 
                          ? 'bg-primary text-white' 
                          : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                
                {/* Step Title */}
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    isGrayedOut
                      ? 'text-gray-400'
                      : isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {title}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {stepNumber < totalSteps && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
