# Frontend changes to make later

These edits go in the **frontend** repo (`Luan-Studio`), not this one. Make them after the backend
is deployed and the automatic emails are confirmed working (see `SETUP_TUTORIAL.md`).

> **Pix is not being implemented yet.** The simulated Pix checkout (`src/lib/pix.ts`,
> `PixPaymentModal.tsx`, the "(Simulado)" badge, the "Já Paguei" / "Verificar Pix" flow) stays
> **exactly as it is** — leave all of it untouched. The only backend features live right now are
> the two automatic **emails**, and those are triggered by the database, not the browser, so this
> list is short.

Each change is tagged:
- **[Required]** — needed for the new backend behaviour to be correct.
- **[Cleanup]** — removes now-dead code; safe to defer.

Line numbers are from the current files and may drift as you edit — search for the quoted code if
they don't line up.

---

## 1. [Required] Stop the browser from also sending the cancellation email

The backend now emails the client automatically the moment a booking flips to `cancelled`. The
site must stop ALSO sending it from the browser, or the client gets two emails.

**File:** `src/components/admin/AppointmentsPanel.tsx`, `handleCancel` (around lines 133–154).

Current:
```tsx
    // Dual-channel: WhatsApp opens now inside the click gesture (popup-safe); email dispatches
    // in the background (provider) or opens the mail client.
    openCancellationWhatsApp(cancelled);
    void sendCancellationEmail(cancelled);

    toast.success(`Agendamento de ${row.booking.clientName} cancelado.`, {
      description: 'Horário liberado. Cliente avisado por WhatsApp e e-mail.',
      duration: 7000,
    });
```

Change to (remove both automatic sends; the email is automatic on the backend now, and WhatsApp
becomes a manual choice — see §2):
```tsx
    toast.success(`Agendamento de ${row.booking.clientName} cancelado.`, {
      description: 'Horário liberado. O cliente será avisado por e-mail automaticamente.',
      duration: 7000,
    });
```

---

## 2. [Required] Make WhatsApp a manual-only button

Per the new rule: WhatsApp is only ever sent when the admin *chooses* to message the client about
a cancellation. It must not open automatically.

Good news — the manual button already exists. On a cancelled row, `AppointmentActions` renders a
**WhatsApp** button wired to `onWhatsApp={() => openCancellationWhatsApp(booking)}` (lines ~290,
338). Keep that exactly as is.

All you're doing is what §1 already did: removing the automatic `openCancellationWhatsApp(cancelled)`
call from `handleCancel`. After that, the only way WhatsApp opens is the admin tapping the button —
which is the desired behaviour.

**Optional — manual e-mail re-send button:** the cancelled-row **E-mail** button
(`onEmailClient`) is now redundant (the client already got the automatic email). Your call:
- Keep it as a "re-send" convenience → leave everything in place.
- Remove it → delete the `onEmailClient` prop + button in `AppointmentActions` and the
  `sendCancellationEmail` helper (lines ~122–131) plus its imports (line 21).

---

## 3. [Required] Stop the browser from opening WhatsApp on a NEW booking

Today, after a client books, the site opens a `wa.me` tab so the client can forward the details to
the shop. The backend now emails the admin automatically, so this popup is no longer needed (and
opening WhatsApp automatically is exactly what we're moving away from).

**File:** `src/components/booking/BookingForm.tsx`, the submit handler (around lines 113–164).

- Remove the `notifyShop(adminNotifyUrl)` calls (around lines 140, 148, 158).
- Remove the `buildBookingNotificationWhatsAppUrl({...})` block (lines ~117–122) and its import
  (line 11), plus the now-unused `adminNotifyUrl` field threaded through `pendingPixPayment`.
- Update the success toast so it no longer says "Confirme pelo WhatsApp que abriu" (line ~138) —
  e.g. `description: `${selectedService.name} em ${scheduledFor}.``.

> Note: the simulated-Pix branch of this handler (`setPendingPixPayment`, the modal) stays — only
> the WhatsApp `notifyShop` calls come out. Removing `adminNotifyUrl` from `pendingPixPayment` is
> just deleting a field that's no longer read.

> If you'd rather keep a manual "avisar no WhatsApp" button for the client, that's fine too — just
> make it a button they tap, not an automatic `window.open`.

---

## 4. [Cleanup] Remove the dead cancellation-email dispatch code

Safe to do once §1 lands and you've confirmed the automatic email arrives:

- `src/lib/emails.ts`: `dispatchCancellationEmail` and the EmailJS/Formspree/mailto helpers are
  now unused. Remove them. **Keep** `composeCancellationEmail` only if you kept the manual e-mail
  re-send button (§2); otherwise it can go too.
- `src/lib/whatsapp.ts`: **keep** `buildCancellationWhatsAppUrl` / `composeCancellationWhatsAppMessage`
  (they still power the manual WhatsApp button, §2). `buildBookingNotificationWhatsAppUrl` becomes
  unused after §3 and can be removed.
- The `VITE_EMAILJS_*` and `VITE_FORMSPREE_ENDPOINT` env vars are then unused and can be dropped
  from `.env` / Vercel.

---

## Not changing

- **Admin login** — left exactly as it is (`AdminGate.tsx` password gate), by request.
- **Pix** — the entire simulated Pix flow stays; not being implemented yet.
- **`VITE_API_BASE_URL`** — not needed for the emails (they're database-triggered, not called from
  the browser). Leave it empty for now. It'll come into play if/when Pix or push notifications land.

---

## Summary checklist

- [ ] Remove automatic cancellation email from `handleCancel` — §1
- [ ] Confirm WhatsApp is manual-only (remove auto-open in `handleCancel`) — §2
- [ ] Remove automatic WhatsApp popup on new booking in `BookingForm` — §3
- [ ] (Cleanup) Remove dead email-dispatch helpers — §4
