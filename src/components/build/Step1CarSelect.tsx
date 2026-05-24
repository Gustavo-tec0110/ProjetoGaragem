import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Car } from '@/lib/types';

interface Props {
  onNext: () => void;
}

export default function Step1CarSelect({ onNext }: Props) {
  const [cars, setCars] = useState<Car[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    async function fetchCars() {
      const { data, error } = await supabase.from('cars').select('*');
      if (!error) setCars(data as Car[]);
    }
    fetchCars();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Escolha o carro</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cars.map((car) => (
          <div
            key={car.id}
            className={`p-2 border rounded cursor-pointer ${selected === car.id ? 'border-orange-600 bg-orange-100' : ''}`}
            onClick={() => {
                setSelected(car.id);
                // Store for later steps
                if (typeof window !== 'undefined') {
                  localStorage.setItem('selectedCarId', car.id);
                  localStorage.setItem('selectedCarSlug', car.slug);
                }
              }}
          >
            <p className="font-medium">{car.name}</p>
            <p className="text-sm text-gray-600">{car.brand} {car.model}</p>
          </div>
        ))}
      </div>
      <button
        className="mt-6 px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
        onClick={onNext}
        disabled={!selected}
      >
        Próximo
      </button>
    </div>
  );
}
