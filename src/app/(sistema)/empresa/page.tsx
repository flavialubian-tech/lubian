import QRCode from 'qrcode';
import { CopiarPix } from '@/components/copiar-pix';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao } from '@/components/ui';
import { exigirGestao } from '@/lib/auth';
import { buscarEmpresa } from '@/lib/empresa';
import { moeda } from '@/lib/formato';
import { pixDaEmpresa } from '@/lib/pix';
import { salvarEmpresa } from './actions';

export const metadata = { title: 'Dados da empresa' };

export default async function DadosEmpresa() {
  const sessao = await exigirGestao();
  const empresa = await buscarEmpresa(sessao.empresaId);
  // Pix de teste de R$ 1,00: pagar pelo app do banco confere chave, nome e valor antes de usar com clientes.
  const codigoTeste = pixDaEmpresa(empresa, 1, 'TESTE');
  const qrTeste = codigoTeste ? await QRCode.toDataURL(codigoTeste, { margin: 1, width: 320 }) : null;
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
    </>
  );
}
