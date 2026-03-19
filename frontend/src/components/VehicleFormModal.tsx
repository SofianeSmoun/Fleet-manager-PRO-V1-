import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Vehicle } from '@/types/vehicle';

const immatriculationRegex = /^\d{2}·\d{4}·ALG$/;

const vehicleFormSchema = z.object({
  immatriculation: z
    .string()
    .regex(immatriculationRegex, 'Format attendu : WW·NNNN·ALG'),
  vin: z.string().optional().or(z.literal('')),
  marque: z.string().min(1, 'Marque requise'),
  modele: z.string().min(1, 'Modèle requis'),
  annee: z.coerce.number().int().min(2000).max(2030),
  km: z.coerce.number().int().min(0, 'Km doit être positif'),
  carburant: z.enum(['DIESEL', 'ESSENCE', 'GPL']),
  couleur: z.string().optional().or(z.literal('')),
  clientId: z.string().uuid('Client requis'),
  notes: z.string().optional().or(z.literal('')),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface ClientOption {
  id: string;
  nom: string;
}

interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleFormData) => void;
  vehicle?: Vehicle | undefined;
  isLoading?: boolean | undefined;
}

export default function VehicleFormModal({
  open,
  onClose,
  onSubmit,
  vehicle,
  isLoading,
}: VehicleFormModalProps): JSX.Element | null {
  const isEdit = !!vehicle;

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ClientOption[] }>('/clients?limit=100');
      return data.data;
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      carburant: 'DIESEL',
      annee: new Date().getFullYear(),
      km: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (vehicle) {
        reset({
          immatriculation: vehicle.immatriculation,
          vin: vehicle.vin ?? '',
          marque: vehicle.marque,
          modele: vehicle.modele,
          annee: vehicle.annee,
          km: vehicle.km,
          carburant: vehicle.carburant,
          couleur: vehicle.couleur ?? '',
          clientId: vehicle.clientId,
          notes: vehicle.notes ?? '',
        });
      } else {
        reset({
          immatriculation: '',
          vin: '',
          marque: '',
          modele: '',
          annee: new Date().getFullYear(),
          km: 0,
          carburant: 'DIESEL',
          couleur: '',
          clientId: '',
          notes: '',
        });
      }
    }
  }, [open, vehicle, reset]);

  if (!open) return null;

  const fieldClass =
    'w-full px-3 py-2 border border-[#E2E6ED] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA4] focus:border-transparent';
  const errorClass = 'text-xs text-[#C0392B] mt-1';
  const labelClass = 'block text-sm font-medium text-[#1A2332] mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E2E6ED]">
          <h2 className="text-lg font-semibold text-[#1A2332]">
            {isEdit ? 'Modifier le véhicule' : 'Nouveau véhicule'}
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="px-6 py-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Immatriculation *</label>
              <input {...register('immatriculation')} className={fieldClass} placeholder="16·2341·ALG" />
              {errors.immatriculation && <p className={errorClass}>{errors.immatriculation.message}</p>}
            </div>
            <div>
              <label className={labelClass}>VIN</label>
              <input {...register('vin')} className={fieldClass} />
              {errors.vin && <p className={errorClass}>{errors.vin.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marque *</label>
              <input {...register('marque')} className={fieldClass} />
              {errors.marque && <p className={errorClass}>{errors.marque.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Modèle *</label>
              <input {...register('modele')} className={fieldClass} />
              {errors.modele && <p className={errorClass}>{errors.modele.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Année *</label>
              <input type="number" {...register('annee')} className={fieldClass} />
              {errors.annee && <p className={errorClass}>{errors.annee.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Km *</label>
              <input type="number" {...register('km')} className={fieldClass} />
              {errors.km && <p className={errorClass}>{errors.km.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Carburant</label>
              <select {...register('carburant')} className={fieldClass}>
                <option value="DIESEL">Diesel</option>
                <option value="ESSENCE">Essence</option>
                <option value="GPL">GPL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Couleur</label>
              <input {...register('couleur')} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Client *</label>
              <select {...register('clientId')} className={fieldClass}>
                <option value="">Sélectionner un client</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
              {errors.clientId && <p className={errorClass}>{errors.clientId.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea {...register('notes')} className={fieldClass} rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E6ED]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#1A2332] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#1D6FA4] text-white text-sm font-medium rounded-md hover:bg-[#185d8a] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
