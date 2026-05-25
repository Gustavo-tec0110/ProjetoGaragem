'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Part } from '@/lib/types';

interface Props {
  onPrev: () => void;
  onNext: () => void;
}

export default function Step3Parts({ onPrev, onNext }: Props) {
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compatScore, setCompatScore] = useState(0);
  const [budget, setBudget] = useState(0);

  // For demo we assume a car slug is stored in localStorage from step 1
  const carSlug = typeof window !== 'undefined' ? localStorage.getItem('selectedCarSlug') : null;

  useEffect(() => {
    async function fetchParts() {
      if (!carSlug) return;
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .contains('compatible_cars', [carSlug]);
      if (!error) setParts(data as Part[]);
    }
    fetchParts();
  }, [carSlug]);

  const togglePart = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
    // Update compatibility & budget (simplified)
    const selectedParts = parts.filter((p) => newSet.has(p.id));
    const totalPrice = selectedParts.reduce((sum, p) => sum + (p.price_min ?? 0), 0);
    setBudget(totalPrice);
    setCompatScore(selectedParts.length / parts.length * 100);
    // Persist selected parts IDs for later steps
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedParts', JSON.stringify(Array.from(newSet)));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Seleção de Peças</h2>
      <p className="mb-2">Score de compatibilidade: {compatScore.toFixed(0)}%</p>
      <p className="mb-4">Orçamento parcial: R$ {budget.toLocaleString('pt-BR')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-4">
        {parts.map((part) => (
          <div
            key={part.id}
            className={`p-2 border rounded cursor-pointer ${selected.has(part.id) ? 'border-orange-600 bg-orange-100' : ''}`}
            onClick={() => togglePart(part.id)}
          >
            <p className="font-medium">{part.name}</p>
            <p className="text-sm text-gray-600">{part.brand}</p>
            <p className="text-sm">Preço: R$ {(part.price_min ?? 0).toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 bg-gray-300 rounded">
          Voltar
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-orange-600 text-white rounded"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
