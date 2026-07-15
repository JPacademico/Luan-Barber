# Luan Studio Barber

Site institucional e sistema de agendamento da barbearia Luan Studio, em Aracaju/SE.

React 19 + TypeScript + Vite + Tailwind + Zustand.

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

## Limitações conhecidas (versão frontend-only)

Este é um projeto **sem backend**. Isso é intencional nesta fase, mas define o que o sistema
pode e não pode fazer:

- **Os dados não saem do navegador.** Agendamentos, folgas e preços ficam em `localStorage`,
  por dispositivo. Um agendamento feito no celular do cliente **não aparece** no painel do
  barbeiro em outro aparelho. Abas do mesmo navegador ficam sincronizadas; aparelhos
  diferentes, não.
- **A senha do `/admin` é pública.** A verificação roda no navegador, então a senha está no
  bundle JavaScript e é legível por qualquer visitante. `VITE_ADMIN_PASSWORD` só tira o valor do
  repositório — não do bundle. Trate `/admin` como público até existir autenticação de servidor.
- **O Pix é simulado.** O QR Code é ilustrativo e nenhuma cobrança real é gerada. O botão
  "Já paguei" apenas sinaliza ao barbeiro que o cliente afirma ter pago.
- **E-mails são manuais.** O cancelamento abre o programa de e-mail do barbeiro com o texto
  pronto; nada é enviado automaticamente.

Resolver qualquer um destes itens exige backend (banco de dados, autenticação, gateway de
pagamento e envio de e-mail).

## Retenção de dados

- Lista ativa: o trabalho do dia. Concluídos/cancelados saem a partir das 22:00.
- Histórico: mantido durante o ano corrente para o dashboard; apagado na virada do ano.

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Tudo com prefixo `VITE_` vai para o navegador e **não é
secreto**.
