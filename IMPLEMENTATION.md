# Plano de Implementação

Duas funcionalidades, em dois repositórios:

- **A — "Meus Agendamentos":** o cliente cancela ou remarca sozinho, sem login.
- **B — Notificações do admin:** lembrete 10 minutos antes, e aviso de cancelamento/remarcação.

> **Status: código pronto nos dois repositórios. Nada foi publicado.** `npm run build` e
> `npm run lint` passam limpos no frontend. As migrations e Edge Functions do backend foram
> escritas seguindo os padrões já existentes no repo, mas **não há Deno instalado neste ambiente**
> para rodar `deno check` — a revisão delas foi manual, não compilada. Publicação em produção é um
> passo manual à parte (§F).

> **Escopo de repositório.** A UI e a lógica de cliente ficam em `Luan-Studio`. **Toda** a parte de
> notificação (migrations, Edge Functions, cron) fica em `Luan-Studio-Back` — repositório separado.

## Decisões (resolvidas)

- **C1 — Prazo para cancelar/remarcar: sem prazo.** O cliente pode alterar até o próprio horário
  começar. Nada foi implementado para bloquear isso — decisão explícita do dono.
- **C2 — Privacidade: endurecer.** Implementado como duas Edge Functions com escopo estreito
  (`lookup-booking-by-phone`, `lookup-bookings-by-ids`) em vez de filtrar a lista completa de
  agendamentos já carregada no cliente. Ver §A2 e o "o que ficou de fora" no fim desta seção.
- **C3 — Antecedência do lembrete: 10 minutos**, como pedido originalmente.

---

## 🔴 Bloqueador — corrigido

`public/sw.js` usava `tag: 'novo-agendamento'` fixo em todo push, o que fazia notificações
diferentes se substituírem. Corrigido: cada tipo de push agora define sua própria `tag`
(`novo-<id>`, `lembrete-<id>`, `cancelado-<id>`, `remarcado-<id>`), com `renotify: true`, e um
fallback `luan-${Date.now()}` para qualquer push que chegue sem `tag`. `CACHE_VERSION` subiu de
`v5` para `v6` para que os PWAs já instalados peguem o novo service worker.

**Arquivos:** [public/sw.js](public/sw.js) · `_shared/push.ts` (campo `tag` no `PushPayload`) ·
`send-push/index.ts` (agora envia `tag: 'novo-' + booking.id`).

---

## A — "Meus Agendamentos" — ✅ implementado

Identificação sem login, por dois caminhos combinados:

1. **ID salvo no aparelho** (principal, sem atrito) — cobre quem volta no mesmo navegador.
2. **Busca por telefone** (alternativa) — cobre quem entra de outro aparelho.

### A1. Tipos e schema — feito

- [src/types/index.ts](src/types/index.ts): `Booking` ganhou `rescheduledAt`, `originalDate`,
  `originalTime`, `cancelledBy`.
- Backend: `Luan-Studio-Back/supabase/migrations/0014_client_self_service.sql` — mesmas colunas em
  `public.bookings`, todas nullable.
- [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts): `BookingRow`, `rowToBooking` (agora
  exportado — reaproveitado pela lib de lookup) e `bookingToRow` atualizados. **`patchBooking`'s
  `columnMap`** ganhou as 4 colunas novas **e também `date`/`time`**, que não estavam na allowlist
  — sem isso, nenhum PATCH de remarcação teria efeito, silenciosamente.
- [src/repositories/bookingRepository.ts](src/repositories/bookingRepository.ts):
  `backfillBooking` preenche os 4 campos novos para registros locais antigos.

### A2. Identidade — feito, com o endurecimento do §C2

- [src/lib/myBookings.ts](src/lib/myBookings.ts) — `rememberBooking` / `forgetBooking` /
  `readRememberedIds` (localStorage) + `digitsOnly/isPlausiblePhone`.
- [src/lib/bookingLookupApi.ts](src/lib/bookingLookupApi.ts) — chama as Edge Functions abaixo em
  vez de filtrar `allBookings` no cliente. **Cai de volta** para filtrar o store local quando
  `VITE_API_BASE_URL` não está configurado (mesmo padrão de degradação do Pix/push já existente),
  já que nesse modo não há dado de outros clientes para vazar.
- `BookingForm.handleConfirmBooking` chama `rememberBooking(newBooking.id)` logo após `addBooking`.
- Backend, novas Edge Functions (service role, escopo estreito):
  - `lookup-bookings-by-ids` — recebe até 20 UUIDs, devolve só as linhas correspondentes.
  - `lookup-booking-by-phone` — recebe um telefone, compara dígitos-only nos dois lados
    (`endsWith` nas duas direções, para tolerar DDI presente ou ausente), devolve até 20
    resultados.
  - Ambas registradas em `config.toml` com `verify_jwt = false` (chamadas direto do navegador, sem
    sessão Supabase — igual ao `verify-admin` já existente).

**O que ficou de fora do endurecimento, de propósito:** `public.bookings` continua com
`select=*` liberado para `anon` (RLS `using (true)`, inalterado). Fechar isso de verdade exigiria
autenticação real do admin (hoje o painel lê a tabela do mesmo jeito aberto, sem sessão Supabase) —
um projeto à parte, maior, já apontado em `supabase/schema.sql`. O que foi endurecido é
especificamente o padrão de consulta desta funcionalidade nova: a tela "Meus Agendamentos" não
soma mais "todo mundo pode ler os dados de todo mundo" a "e agora tem uma busca pronta pra isso" —
ela nunca lê a lista completa do cliente. Sem limitação de taxa (rate limit) nas duas funções —
não há infraestrutura pra isso neste projeto; ver comentário no topo de
`lookup-booking-by-phone/index.ts`.

### A3. Lógica de remarcação — feito

- [src/lib/timeSlots.ts](src/lib/timeSlots.ts): `isRangeAvailable` ganhou `ignoreSlots?: Set<string>`
  — sem isso, remarcar sempre colide com o próprio horário atual (nada removia os marcadores
  antigos de `occupied`). **Verificado por execução real** (6 casos, incluindo mesmo horário,
  horário sobreposto, e "ignoreSlots não vaza para outra reserva") — todos passaram.
- [src/components/booking/TimeSlotGrid.tsx](src/components/booking/TimeSlotGrid.tsx) ganhou o
  mesmo `ignoreSlots?` opcional, repassado a `isRangeAvailable` e também usado para não marcar o
  próprio horário do cliente como "já reservado" (riscado) na grade.
- [src/store/bookingStore.ts](src/store/bookingStore.ts): `rescheduleBooking(id, date, time)` e
  `cancelBookingByClient(id, reason)`. `cancelBooking` (admin) passou a gravar
  `cancelledBy: 'admin'` para simetria.

### A4. UI — feito

| Arquivo | Status |
| --- | --- |
| [src/pages/MyBookingsPage.tsx](src/pages/MyBookingsPage.tsx) | novo — rota `lazy` `/meus-agendamentos` |
| [src/components/mybookings/BookingLookup.tsx](src/components/mybookings/BookingLookup.tsx) | novo |
| [src/components/mybookings/MyBookingCard.tsx](src/components/mybookings/MyBookingCard.tsx) | novo |
| [src/components/mybookings/RescheduleDialog.tsx](src/components/mybookings/RescheduleDialog.tsx) | novo — reaproveita `BookingCalendar` + `TimeSlotGrid` |
| [src/components/mybookings/ClientCancelDialog.tsx](src/components/mybookings/ClientCancelDialog.tsx) | novo |
| [src/App.tsx](src/App.tsx) | rota `/meus-agendamentos` adicionada |
| [src/components/layout/Header.tsx](src/components/layout/Header.tsx) | link "Meus Agendamentos" em `NAV_LINKS` |

Usa o `Modal` existente (safe-area, `dvh`, scroll-lock já tratados) e o `BookingCalendar` existente
(janela de 7 dias, domingos, dias fechados — tudo já correto, não reimplementado).

### A5. Casos de borda

- **Conflito de índice único (`23505`).** Em vez de tratar o erro pós-escrita, o
  `RescheduleDialog` faz um **segundo** `isRangeAvailable` no momento exato do clique em
  "Confirmar" (não só quando a grade foi desenhada) — mesmo padrão que `BookingForm` já usa antes
  de criar um agendamento nôvo. Reduz a janela da corrida a quase zero, mas não elimina o `23505`
  como backstop final do banco; um conflito nesse intervalo residual ainda cairia no mecanismo
  genérico `lastError` + `refresh()` da store, sem UI dedicada para esse caso específico.
- **Sem prazo de corte** (§C1, decidido).
- Cancelar/Remarcar só aparecem para `status === 'active'` (`MyBookingCard`).
- Pix já pago: aviso de estorno manual no `ClientCancelDialog`, mesmo texto do painel admin.

---

## B — Notificações do admin — ✅ implementado

Tudo em `Luan-Studio-Back`.

### B1. Lembrete 10 minutos antes

- `migrations/0015_admin_reminders.sql` — coluna `reminder_sent_at` + `cron.schedule('luan-reminders', '* * * * *', ...)`.
- `functions/send-reminders/index.ts` — busca agendamentos ativos de **hoje** sem
  `reminder_sent_at`, filtra em memória por janela de 10 minutos usando o deslocamento fixo
  UTC-3 (Brasil não tem mais horário de verão desde 2019 — documentado no arquivo). Marca
  `reminder_sent_at` mesmo se o push falhar (best-effort, mesmo padrão do `send-push` existente,
  que também não reenvia).

### B2. Push de cancelamento / remarcação

- `migrations/0016_admin_change_notifications.sql` — função `on_booking_changed()` + trigger
  `bookings_after_update_push` com cláusula `WHEN` que só dispara em (a) status virando
  `cancelled` ou (b) `date`/`time` mudando com o booking ainda `active`. **A guarda importa mais
  aqui que no push de novo agendamento**: sem ela, o próprio `send-reminders` gravando
  `reminder_sent_at` reentraria no trigger.
- `functions/send-change-push/index.ts` — recebe o payload (`NEW` + `old_date`/`old_time`
  anexados pelo trigger), decide cancelamento vs. remarcação pelo `status`, usa `tag` distinta
  para cada caso.

### B4. Publicação (passo manual, não incluído aqui)

Nada disso funciona sozinho até:
1. `private.app_settings` ter `functions_base_url` e `service_role_key` (já era um passo manual
   antes desta mudança — ver README do backend).
2. `supabase functions deploy` para as 4 funções novas (`lookup-booking-by-phone`,
   `lookup-bookings-by-ids`, `send-reminders`, `send-change-push`).
3. `supabase db push` (ou equivalente) para aplicar as migrations `0014`–`0016` no projeto ativo.
4. Um novo deploy do frontend, para o service worker corrigido (`CACHE_VERSION v6`) alcançar quem
   já instalou o PWA.

---

## E — Verificação

O type-check real deste repositório é `npm run build` (`tsc -b && vite build`) — **executado, sem
erros** a cada etapa deste trabalho. `npm run lint` (oxlint) também passou limpo.
`tsc --noEmit -p tsconfig.json` continua não checando nada (`tsconfig.json` da raiz é solution-style).

O backend **não pôde ser type-checado** — não há `deno` instalado neste ambiente. As Edge
Functions novas foram revisadas manualmente contra os tipos em `_shared/types.ts` e o padrão das
funções já existentes (`save-push-subscription`, `send-push`), mas isso não substitui `deno check`
nem um deploy real. Rodar isso é o primeiro passo recomendado antes de publicar.

Testado por execução real (não só leitura), fora do type-check:

- `isRangeAvailable` com `ignoreSlots` — 6 casos, incluindo o cenário que motivou o campo (remarcar
  para o mesmo horário sem `ignoreSlots` falha; com `ignoreSlots`, funciona).
- `generateTimeSlots`/`isRangeAvailable` com a regra de almoço (trabalho anterior, ainda válido).
- `parseISO('2026-08-07')` vs. `new Date('2026-08-07T00:00:00')` sob `TZ=America/Sao_Paulo` —
  confirma que os dois produzem a mesma data local, o que o `RescheduleDialog` depende para
  inicializar o calendário no dia certo do agendamento.

Não testado por execução (sem ambiente Supabase local disponível):

- A janela de 10 minutos do `send-reminders` com um agendamento perto da meia-noite.
- A guarda `WHEN` do trigger de UPDATE, ao vivo.
- O conflito `23505` na remarcação, com duas abas disputando o mesmo horário.

Nenhum teste visual/E2E foi executado, conforme pedido.
