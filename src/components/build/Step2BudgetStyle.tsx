'use client';

import React, { useState } from 'react';

type Style = {
  id: string;
  label: string;
  description: string;
};

const styles: Style[] = [
  { id: 'jdm', label: 'JDM', description: 'Estilo japonês' },
  { id: 'sleeper', label: 'Sleeper', description: 'Disfarçado' },
  { id: 'corrida', label: 'Corrida', description: 'Alto desempenho' },
  { id: 'rebaixado', label: 'Rebaixado', description: 'Altura baixa' },
  { id: 'som', label: 'Som', description: 'Audio premium' },
  { id: 'drift', label: 'Drift', description: 'Deslizamento controlado' },
  { id: 'rally', label: 'Rally', description: 'Off‑road' },
  { id: 'luxo', label: 'Luxo', description: 'Acabamento premium' },
  { id: 'turbostreet', label: 'Turbo Street', description: 'Turbo casual' },
];

interface Props {
  onPrev: () => void;
  onNext: () => void;
}

export default function Step2BudgetStyle({ onPrev, onNext }: Props) {
  const [budget, setBudget] = useState(5000);
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Orçamento e Estilo</h2>
      <div className="mb-6">
        <label className="block font-medium mb-2">Orçamento (R$) </label>
        <input
          type="range"
          min={2000}
          max={100000}
          step={500}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-center">R$ {budget.toLocaleString('pt-BR')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {styles.map((s) => (
          <div
            key={s.id}
            className={`p-2 border rounded cursor-pointer ${selectedStyle === s.id ? 'border-orange-600 bg-orange-100' : ''}`}
            onClick={() => setSelectedStyle(s.id)}
          >
            <p className="font-medium">{s.label}</p>
            <p className="text-sm text-gray-600">{s.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 bg-gray-300 rounded">
          Voltar
        </button>
        <button
          onClick={() => {
                // store budget and style
                if (typeof window !== 'undefined') {
                  localStorage.setItem('budget', budget.toString());
                  localStorage.setItem('selectedStyle', selectedStyle);
                }
                onNext();
              }}
          disabled={!selectedStyle}
          className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
