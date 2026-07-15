import { z } from 'zod';

export const bookingFormSchema = z.object({
  clientName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  clientEmail: z.string().email('Email inválido'),
  clientPhone: z.string()
    .min(10, 'Telefone incompleto')
    .regex(/^[\d\s()+-]+$/, 'Apenas números e símbolos de telefone permitidos')
    // A simple regex just to ensure it looks like a phone number. 
    // In a real app we might use a stricter format like: /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
