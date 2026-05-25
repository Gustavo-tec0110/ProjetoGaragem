'use client';

import { useState } from 'react';
import Step1CarSelect from './Step1CarSelect';
import Step2BudgetStyle from './Step2BudgetStyle';
import Step3Parts from './Step3Parts';
import Step4Summary from './Step4Summary';

const steps = [
  { id: 1, label: 'Carro' },
  { id: 2, label: 'Orçamento & Estilo' },
  { id: 3, label: 'Peças' },
  { id: 4, label: 'Resumo' },
];

export default function Stepper() {
  const [current, setCurrent] = useState(1);

  const renderStep = () => {
    switch (current) {
      case 1:
        return <Step1CarSelect onNext={() => setCurrent(2)} />;
      case 2:
        return (
          <Step2BudgetStyle
            onPrev={() => setCurrent(1)}
            onNext={() => setCurrent(3)}
          />
        );
      case 3:
        return (
          <Step3Parts
            onPrev={() => setCurrent(2)}
            onNext={() => setCurrent(4)}
          />
        );
      case 4:
        return <Step4Summary onPrev={() => setCurrent(3)} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with steps */}
      <div className="flex justify-center gap-4">
        {steps.map((s) => (
          <div
            key={s.id}
            className={`px-4 py-2 rounded ${s.id === current ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            {s.label}
          </div>
        ))}
      </div>
      {/* Step content */}
      <div>{renderStep()}</div>
    </div>
  );
}
