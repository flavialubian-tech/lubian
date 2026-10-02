import { Cabecalho } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { carregarOpcoesEditor, estadoInicialNovo } from '@/lib/editor-opcoes';
import { EditorOrcamento } from '../editor';

export const metadata = { title: 'Novo orçamento' };

export default async function NovoOrcamento(props: PageProps<'/orcamentos/novo'>) {
  const sessao = await exigirOperador();
  const { obra, vistoria } = (await props.searchParams) as { obra?: string; vistoria?: string };
  const opcoes = await carregarOpcoesEditor(sessao.empresaId);
  const inicial = await estadoInicialNovo(sessao.empresaId, opcoes, { obraId: obra, vistoriaId: vistoria });
  return (
    <>
      <Cabecalho titulo="Novo orçamento técnico" subtitulo="Custo operacional × (1 + markup) → ancoragem com desconto de parceria" />
      <EditorOrcamento id={null} inicial={inicial} opcoes={opcoes} />
    </>
  );
}
