import { z } from 'zod';

export const bookingFormSchema = z.object({
  clientName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  clientPhone: z.string()
    .regex(/^[\d\s()+-]+$/, 'Apenas números e símbolos de telefone permitidos')
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 13;
      },
      'Telefone incompleto — informe DDD + número'
    ),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
