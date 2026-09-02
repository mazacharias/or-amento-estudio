import { Cabecalho } from '@/components/cabecalho';
import { CatalogoServicos } from '@/components/catalogo-servicos';
import { listarServicos } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default function PaginaServicos() {
  return (
    <>
      <Cabecalho
        titulo="Catálogo de serviços"
        descricao="As horas de referência aqui viram o ponto de partida de todo orçamento — ajuste conforme a realidade dos projetos entregues."
      />
      <CatalogoServicos inicial={listarServicos()} />
    </>
  );
}
