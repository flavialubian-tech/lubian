# Operação — rodar o Lubian Gestão no computador (Windows 10)

O sistema roda inteiro no computador da Lubian, sem nenhum serviço online: banco, fotos, comprovantes e PDFs
ficam na pasta do sistema. Internet só é necessária para **instalar** e para **atualizar**.

## 1. Instalar (uma vez, com internet)
1. Instale o **Node.js 22 LTS**: <https://nodejs.org> → botão "LTS" → avançar até o fim (opções padrão).
2. Instale o **Git**: <https://git-scm.com/download/win> → avançar até o fim (opções padrão).
3. Abra o **Prompt de Comando** (tecla Windows, digite `cmd`, Enter) e rode:
   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/flavialubian-tech/lubian.git "Lubian Gestao"
   ```
   Na primeira vez abre uma janela para entrar na conta do GitHub (o repositório é privado).
4. Abra a pasta `Documentos\Lubian Gestao` e dê dois cliques em **`iniciar-lubian.bat`**.
   A primeira abertura instala e prepara tudo (alguns minutos). Nas próximas, abre em segundos.
5. Se o Windows perguntar sobre o **Firewall** para o "Node.js": marque **Redes privadas** e clique em Permitir
   (é o que deixa os celulares do Wi-Fi abrirem o sistema).
6. Entre com `flavia@lubian.local` / `lubian2026` e **troque a senha** em "Minha conta"
   (e as de `bruna@lubian.local` e `anderson@lubian.local`).

Dica: clique com o botão direito em `iniciar-lubian.bat` → **Criar atalho** → arraste o atalho para a Área de
Trabalho. Para abrir junto com o Windows, copie o atalho para a pasta que abre com `Win + R` → `shell:startup`.

## 2. Usar no dia a dia
- Abra pelo atalho **iniciar-lubian**. Uma janela preta fica aberta: **não feche** enquanto estiver usando —
  fechá-la desliga o sistema. O navegador abre sozinho em `http://localhost:3000`.
- **PDFs** usam o Chrome ou o Edge do computador (o Edge já vem no Windows 10).
- **Celular** (Bruna, equipe): precisa estar no **mesmo Wi-Fi**. Em "Minha conta" aparece o endereço
  (ex.: `http://192.168.0.10:3000`) com um QR Code para abrir pela câmera.
  Para o endereço não mudar, peça a quem cuida da internet uma **reserva de IP (DHCP)** para este computador no roteador.
- **Cliente**: o link de aprovação não abre fora daqui. Envie o **PDF** pelo WhatsApp e, quando o cliente aprovar,
  use o botão **Aprovado manualmente** no orçamento.
- **Equipe fora do Wi-Fi**: envie a escala (print ou PDF da agenda) pelo WhatsApp.

## 3. Backup (automático)
- Todo dia, na **primeira vez que o sistema é aberto**, ele copia o banco e os arquivos para
  `Documentos\Lubian Backups\lubian-AAAA-MM-DD`. Ficam os 30 últimos dias + o último de cada mês (12 meses).
- Se o backup atrasar mais de 3 dias, o **Painel** mostra um aviso vermelho.
- **Importante:** backup no mesmo computador não protege contra roubo ou HD queimado. Escolha uma destas:
  - **Pendrive/HD externo**: crie o arquivo `.env.local` na pasta do sistema com a linha
    `BACKUP_DIR=E:\Lubian Backups` (troque `E:` pela letra do pendrive) e deixe-o conectado; ou
  - **Google Drive para computador** (grátis): aponte `BACKUP_DIR` para uma pasta dentro do Google Drive
    (ex.: `BACKUP_DIR=G:\Meu Drive\Lubian Backups`) — a cópia sobe sozinha para a nuvem.
  - No mínimo, uma vez por semana copie a pasta `Lubian Backups` para um pendrive.
- Backup manual: feche o sistema, abra o Prompt de Comando na pasta do sistema e rode `npm run backup`.

## 4. Voltar um backup
1. Feche o sistema (janela preta).
2. Na pasta do sistema, Prompt de Comando: `npm run restaurar` (lista os backups).
3. `npm run restaurar lubian-2026-10-02` (o dia desejado).
4. Abra o sistema de novo. Os dados de antes ficam guardados em `.data\pglite-antes-...` (não são apagados).

## 5. Atualizar o sistema
Feche o sistema e dê dois cliques em **`atualizar-lubian.bat`** (precisa de internet). Os dados não são mexidos.
Na próxima abertura ele se prepara de novo (alguns minutos).

## 6. Se algo der errado
| Problema | O que fazer |
|---|---|
| "Node.js não encontrado" | Instale o Node.js 22 LTS (passo 1.1) e abra de novo |
| PDF não gera ("Não foi possível abrir o navegador") | Instale o Google Chrome, ou crie `.env.local` com `CHROMIUM_PATH=` e o caminho do `chrome.exe`/`msedge.exe` |
| Celular não abre | Confira se está no mesmo Wi-Fi, se o endereço é o de "Minha conta" e se o Firewall permitiu o Node.js (Painel de Controle → Firewall → Permitir um aplicativo) |
| "O sistema já está aberto" | Ele já estava rodando; o navegador abre na página dele |
| Porta 3000 ocupada | Em `.env.local`, `PORT=3001` |

## Arquivo `.env.local` (opcional)
Arquivo de texto na pasta do sistema, uma configuração por linha:

| Linha | Para quê |
|---|---|
| `BACKUP_DIR=E:\Lubian Backups` | Onde guardar os backups (padrão: `Documentos\Lubian Backups`) |
| `CHROMIUM_PATH=C:\...\chrome.exe` | Navegador para os PDFs, se a detecção automática falhar |
| `PORT=3001` | Outra porta, se a 3000 estiver ocupada |
