'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';

/** Checklist de linhas de texto (entregáveis, fora do escopo). */
export function ListaEditavel({
  label,
  itens,
  onItens,
  placeholder,
  dica,
}: {
  label: string;
  itens: string[];
  onItens: (itens: string[]) => void;
  placeholder?: string;
  dica?: string;
}) {
  const [novo, setNovo] = React.useState('');

  function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    onItens([...itens, texto]);
    setNovo('');
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {dica ? <p className="text-xs text-sutil">{dica}</p> : null}
      {itens.map((item, i) => (
        <div key={`${item}-${i}`} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const novos = [...itens];
              novos[i] = e.target.value;
              onItens(novos);
            }}
          />
          <Button
            variant="fantasma"
            size="icone"
            aria-label={`Remover ${item}`}
            onClick={() => onItens(itens.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={novo}
          placeholder={placeholder}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <Button variant="fantasma" size="icone" aria-label="Adicionar item" onClick={adicionar}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
