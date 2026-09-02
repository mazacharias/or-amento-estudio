import { Cabecalho } from '@/components/cabecalho';
import { FormularioConfig } from '@/components/formulario-config';
import { obterConfig } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default function PaginaConfig() {
  const config = obterConfig();
  return (
    <>
      <Cabecalho
        titulo="Configurações do estúdio"
        descricao="Daqui sai o custo-hora que sustenta todos os orçamentos. Números realistas aqui valem mais que qualquer desconto lá na frente."
      />
      <FormularioConfig inicial={config} />
    </>
  );
}
