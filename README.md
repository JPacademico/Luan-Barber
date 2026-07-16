# Luan Studio Barber

Site institucional e sistema de agendamento da barbearia Luan Studio, em Aracaju/SE.

React 19 + TypeScript + Vite + Tailwind + Zustand. PWA instalável, com sincronização opcional
na nuvem (Supabase). Sem dependências de backend obrigatórias — funciona 100% no navegador e
liga os recursos de nuvem quando as variáveis de ambiente estão presentes.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run lint
```

## Rotas

| Rota       | Descrição                                          |
| ---------- | -------------------------------------------------- |
| `/`        | Site público (hero, promoções, sobre, localização)  |
| `/booking` | Catálogo de serviços/preços + checkout             |
| `/admin`   | Painel administrativo (protegido por senha)         |

## Deploy (Vercel)

O projeto é uma SPA estática. O [`vercel.json`](./vercel.json) já contém tudo que o Vercel precisa:

- **`rewrites`** — obrigatório. Sem ele, acessar `/booking` ou `/admin` direto (ou dar F5 nessas
  páginas) retorna **404**, porque não existe arquivo nesses caminhos: o roteamento é do
  React Router, no navegador. A regra faz o `index.html` responder a qualquer rota, e o Vercel
  continua servindo os arquivos reais de `/assets` antes de aplicar o rewrite.
- `Cache-Control` nos assets (o nome tem hash, então o cache pode ser imutável).
- `X-Robots-Tag: noindex` + [`robots.txt`](./public/robots.txt) — mantém o preview fora do Google.

Basta importar o repositório no Vercel; o build é detectado automaticamente.

### Antes de ir para produção

1. Remover `public/robots.txt` e o header `X-Robots-Tag` do `vercel.json`, senão o site real
   nunca será indexado.
2. Trocar as imagens placeholder (Unsplash) por fotos reais da barbearia — carrossel, foto do
   Luan e certificados, em `src/constants/defaults.ts`.
3. Rever as limitações abaixo.

## Sincronização entre dispositivos (Supabase)

Por padrão os agendamentos ficam em `localStorage` (por dispositivo). Para o painel do barbeiro
enxergar, em qualquer aparelho, o agendamento feito no celular do cliente, ligue a nuvem:

1. Crie um projeto no [Supabase](https://supabase.com).
2. No SQL editor, rode [`supabase/schema.sql`](./supabase/schema.sql) (cria as tabelas
   `bookings` e `day_overrides`).
3. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Vercel → Settings → Environment
   Variables), com os valores em Supabase → Settings → API.
4. Redeploy. Pronto — o app detecta as variáveis e passa a ler/gravar na nuvem sozinho.

Detalhes de arquitetura:

- O acesso a dados fica atrás de uma interface (`src/repositories/bookingRepository.ts`) com duas
  implementações: **Supabase** (nuvem, compartilhada) e **local** (localStorage). O resto do app
  não sabe qual está ativa.
- O cliente Supabase é feito com `fetch` sobre a API REST (PostgREST) — **sem a dependência
  `@supabase/supabase-js`**, para manter o bundle enxuto e o build reprodutível.
- A sincronização usa **polling a cada 15s** + refetch ao focar a aba, em vez do WebSocket
  Realtime. É suficiente para o volume de uma barbearia e não adiciona dependências. Para
  realtime de verdade, troque a assinatura em `SupabaseBookingRepository.subscribe` pelo canal
  Realtime do Supabase.
- **A `anon key` é pública por natureza** — quem protege os dados é o Row Level Security. As
  policies do `schema.sql` são abertas (mesmo nível de confiança do build anterior em
  localStorage); veja o aviso no arquivo antes de um lançamento real.

## PWA (dois apps instaláveis separados)

O site e o painel são **dois PWAs independentes**, cada um com seu próprio manifesto, escopo e
ícone — dá para instalar os dois lado a lado na tela inicial sem se confundirem:

| App          | Manifesto                     | Escopo    | Ícone                    |
| ------------ | ----------------------------- | --------- | ------------------------ |
| Site público | `manifest.webmanifest`        | `/`       | `logo.svg` (logo Luan)   |
| Painel admin | `manifest-admin.webmanifest`  | `/admin`  | `app-icon-admin.svg`     |

`useDocumentMeta` troca o `<link rel="manifest">` (e o favicon) por rota, então o navegador
oferece instalar o app certo dependendo de onde você está. O prompt aparece:

- No site: banner estilizado **"Instalar App"** (posicionado longe do botão flutuante do
  WhatsApp).
- No painel: botão **"Instalar painel"** no cabeçalho do `/admin`.

No iOS, o banner mostra as instruções de "Adicionar à Tela de Início" (o iOS não tem
`beforeinstallprompt`).

Detalhes: o service worker (`public/sw.js`) é registrado só em produção; navegações são
_network-first_ (pega deploys novos, funciona offline), assets com hash _cache-first_, demais
same-origin _stale-while-revalidate_. Supabase e Google Fonts (cross-origin) não são cacheados.

### Ícone / logo

O favicon e os ícones do PWA público usam **`public/logo.svg`** — uma recriação vetorial do logo
da Luan Studio (fundo preto, "LUAN / STUDIO BARBER" em prata). Por ser vetorial, fica nítido em
qualquer tamanho. Se quiser usar o arquivo raster original em vez da versão vetorial, salve-o
como `public/logo.png` e troque as referências em `index.html`, `manifest.webmanifest` e
`src/constants/branding.ts`. Para o banner de instalação em iOS especificamente, versões PNG
192×192 e 512×512 aumentam a compatibilidade — único follow-up recomendado do PWA.

## Notificação de novo agendamento (WhatsApp para o admin)

Quando um cliente confirma um agendamento, o app abre o WhatsApp com uma mensagem já preenchida
(nome, serviço, data, horário, pagamento) **endereçada ao número da barbearia** — que é o número
do admin (`shopInfo.whatsapp`). O cliente toca em enviar e o barbeiro recebe o aviso.

Por que não é 100% automático: um frontend não envia WhatsApp sozinho — isso exige a WhatsApp
Business API e um backend. O padrão viável no navegador é o Click-to-Chat (`wa.me`), que precisa
de um toque do cliente para enviar. Com o Supabase ligado, o painel do admin já mostra o
agendamento em tempo real de qualquer forma; o WhatsApp é um aviso extra.

## Notificações de cancelamento (WhatsApp + e-mail)

Ao cancelar um agendamento no `/admin`, o app dispara os dois canais:

- **WhatsApp:** abre um link Click-to-Chat (`wa.me`) com uma mensagem educada já preenchida
  (data, horário, serviço). O envio final é um toque do barbeiro — um link Click-to-Chat não
  envia sozinho, o que é o comportamento correto para uma mensagem pessoal.
- **E-mail:** se `VITE_EMAILJS_*` ou `VITE_FORMSPREE_ENDPOINT` estiverem configurados, envia
  direto do navegador. Sem eles, abre o programa de e-mail com o texto pronto (fallback `mailto`).

Botões de **WhatsApp** e **E-mail** também ficam disponíveis no agendamento cancelado para reenvio.

## Limitações conhecidas

- **Sem nuvem, os dados são por dispositivo.** Enquanto `VITE_SUPABASE_*` não estiver
  configurado, agendamentos ficam em `localStorage`: abas do mesmo navegador sincronizam, mas
  aparelhos diferentes não. Configure o Supabase (acima) para resolver.
- **A senha do `/admin` é pública.** A verificação roda no navegador, então a senha está no
  bundle e é legível. `VITE_ADMIN_PASSWORD` só a tira do repositório, não do bundle. Trate
  `/admin` como público até existir autenticação de servidor (ex.: Supabase Auth).
- **O Pix é simulado.** O QR Code é ilustrativo e nenhuma cobrança real é gerada.

## Retenção de dados

- Lista ativa: o trabalho do dia. Concluídos/cancelados saem a partir das 22:00.
- Histórico: mantido durante o ano corrente para o dashboard; apagado na virada do ano.

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Tudo com prefixo `VITE_` vai para o navegador e **não é
secreto**.
