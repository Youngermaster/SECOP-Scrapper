import { buttonVariants, EmptyState } from '@secop-radar/ui';
import { Compass } from 'lucide-react';
import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Compass />}
        title="Página no encontrada"
        description="La ruta no existe en SECOP Radar."
        action={
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            Ir a oportunidades
          </Link>
        }
      />
    </div>
  );
}
