'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onPrev: () => void;
}

export default function Step4Summary({ onPrev }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSave = async () => {
    // Simplified: assume carId, style, budget, parts already stored in localStorage
    const carId = localStorage.getItem('selectedCarId') ?? '';
    const style = localStorage.getItem('selectedStyle') ?? '';
    const budget = Number(localStorage.getItem('budget')) || 0;
    const parts = JSON.parse(localStorage.getItem('selectedParts') ?? '[]');

    // Upload image if provided
    let imageUrl: string | null = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `builds/${uuidv4()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('builds').upload(filePath, imageFile);
      if (!uploadErr) imageUrl = supabase.storage.from('builds').getPublicUrl(filePath).data.publicUrl;
    }

    const { error } = await supabase.from('builds').insert([
      {
        slug: uuidv4().slice(0, 8),
        title,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        car_id: carId,
        style,
        budget_min: budget,
        budget_max: budget,
        compatibility_score: 0,
        parts: parts,
        description,
        is_public: isPublic,
        likes_count: 0,
        shares_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    if (error) console.error('Error saving build:', error);
    else alert('Build salva com sucesso!');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Resumo e Publicação</h2>
      <input
        type="text"
        placeholder="Título da Build"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      />
      <textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded p-2 mb-2"
        rows={4}
      />
      <label className="flex items-center mb-2">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mr-2" />
        Tornar pública
      </label>
      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="mb-4" />
      <div className="flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 bg-gray-300 rounded">
          Voltar
        </button>
        <button onClick={handleSave} className="px-4 py-2 bg-orange-600 text-white rounded">
          Salvar Build
        </button>
      </div>
    </div>
  );
}
