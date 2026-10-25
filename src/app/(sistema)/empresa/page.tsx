import QRCode from 'qrcode';
import { CopiarPix } from '@/components/copiar-pix';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao } from '@/components/ui';
import { exigirGestao } from '@/lib/auth';
import { storageConfigurado } from '@/lib/arquivos';
import { listarBackupsNuvem } from '@/lib/backup-nuvem';
import { buscarEmpresa } from '@/lib/empresa';
import { dataCurta, dataHora, moeda } from '@/lib/formato';
import { pixDaEmpresa } from '@/lib/pix';
import { salvarEmpresa } from './actions';

export const metadata = { title: 'Dados da empresa' };

export default async function DadosEmpresa() {
  const sessao = await exigirGestao();
  const empresa = await buscarEmpresa(sessao.empresaId);
  // Pix de teste de R$ 1,00: pagar pelo app do banco confere chave, nome e valor antes de usar com clientes.
  const codigoTeste = pixDaEmpresa(empresa, 1, 'TESTE');
  const qrTeste = codigoTeste ? await QRCode.toDataURL(codigoTeste, { margin: 1, width: 320 }) : null;
  const nuvem = storageConfigurado();
  const automaticos = nuvem ? await listarBackupsNuvem(sessao.empresaId).catch(() => null) : [];
  return (
    <>
      <Cabecalho titulo="Dados da empresa" subtitulo="Aparecem nos orçamentos, recibos e faturas; a chave Pix vai no copia e cola e no QR Code" />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Cartao titulo="Cadastro">
          <Formulario action={salvarEmpresa} className="space-y-4">
            <Campo rotulo="Nome da empresa" name="nome" defaultValue={empresa.nome} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="CNPJ" name="cnpj" defaultValue={empresa.cnpj ?? ''} />
              <Campo rotulo="Telefone" name="telefone" defaultValue={empresa.telefone ?? ''} />
            </div>
            <Campo rotulo="Endereço" name="endereco" defaultValue={empresa.endereco ?? ''} />
            <Campo rotulo="Cidade (ex.: Chapecó/SC)" name="cidade" defaultValue={empresa.cidade ?? ''} />
            <Campo
              rotulo="Chave Pix (CPF, CNPJ, e-mail, celular +55... ou chave aleatória)"
              name="chavePix"
              defaultValue={empresa.chavePix ?? ''}
              data-chave-pix
            />
            <p className="text-xs text-cinza">
              O dinheiro cai na conta onde esta chave está cadastrada. Depois de trocar, faça o Pix de teste ao lado.
            </p>
            <Campo
              rotulo="Link para avaliar no Google (opcional)"
              name="linkAvaliacaoGoogle"
              type="url"
              placeholder="https://g.page/r/.../review"
              defaultValue={empresa.linkAvaliacaoGoogle ?? ''}
            />
            <p className="text-xs text-cinza">
              No Perfil da Empresa no Google, clique em <strong>Pedir avaliações</strong> e copie o link. Quem dá 4 ou 5 estrelas na pesquisa
              do sistema é convidado a avaliar a Lubian no Google.
            </p>
            <Botao type="submit">Salvar</Botao>
          </Formulario>
        </Cartao>
        <Cartao titulo="Pix de teste (R$ 1,00)">
          {codigoTeste && qrTeste ? (
            <div className="space-y-3 text-sm">
              <p>
                Pague pelo app do banco e confira se a chave cai na conta certa e o valor vem como <strong>{moeda(1)}</strong>.
              </p>
              <CopiarPix codigo={codigoTeste} qr={qrTeste} valor={moeda(1)} />
            </div>
          ) : (
            <p className="text-sm text-cinza">Cadastre a chave Pix para gerar o teste.</p>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Backup dos dados" className="mt-6" acoes={<span id="backup" />}>
        <div className="grid gap-6 lg:grid-cols-2" data-backup>
          <div className="space-y-3 text-sm">
            <p>
              {nuvem ? (
                <>
                  <strong>Automático:</strong> todo dia o sistema guarda uma cópia de todos os dados no Supabase (últimos 30 dias + uma por mês).
                </>
              ) : (
                <>
                  <strong>Automático:</strong> no computador, a cópia é feita ao abrir o sistema pelo atalho (pasta Lubian Backups).
                </>
              )}
            </p>
            <p>
              <strong>Uma vez por mês</strong>, baixe uma cópia e guarde fora do sistema (Google Drive ou computador). Assim os dados ficam protegidos
              mesmo se algo acontecer com a conta do Supabase.
            </p>
            <a
              href="/api/backup"
              className="inline-flex items-center rounded-lg bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              data-baixar-backup
            >
              Baixar backup completo agora
            </a>
            <p className="text-xs text-cinza">
              {empresa.backupBaixadoEm ? `Último download: ${dataHora(empresa.backupBaixadoEm)}.` : 'Nenhum backup baixado ainda.'} O arquivo traz
              cadastros, orçamentos, agenda e financeiro; fotos e comprovantes continuam guardados no Storage.
            </p>
          </div>
          {nuvem && (
            <div className="text-sm">
              <p className="mb-2 font-semibold">Cópias automáticas</p>
              {automaticos === null ? (
                <p className="text-vermelho">Não foi possível listar as cópias agora.</p>
              ) : automaticos.length === 0 ? (
                <p className="text-cinza">A primeira cópia é feita hoje, nos próximos minutos.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                  {automaticos.map((b) => (
                    <li key={b.nome} className="flex items-center justify-between py-1.5">
                      <span>
                        {dataCurta(`${b.data}T12:00:00`)} <span className="text-xs text-cinza">· {Math.max(1, Math.round(b.tamanho / 1024))} KB</span>
                      </span>
                      <a href={`/api/backup?nome=${encodeURIComponent(b.nome)}`} className="text-xs font-semibold text-azul hover:underline">
                        Baixar
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Cartao>
    </>
  );
}
