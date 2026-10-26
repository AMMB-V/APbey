import React from 'react';

export type AceroIconId =
  | 'i-trofeo'
  | 'i-llave'
  | 'i-doble'
  | 'i-todos'
  | 'i-suizo'
  | 'i-grupos'
  | 'i-bey'
  | 'i-spin'
  | 'i-over'
  | 'i-burst'
  | 'i-xtreme'
  | 'i-tarjeta'
  | 'i-arbitro'
  | 'i-participante'
  | 'i-checkin'
  | 'i-beycheck'
  | 'i-deshacer'
  | 'i-envivo'
  | 'i-bye'
  | 'i-descalificar'
  | 'i-posiciones'
  | 'i-sede'
  | 'i-exportar'
  | 'i-compartir'
  | 'i-ajustes'
  | 'i-entrar'
  | 'i-anadir'
  | 'i-cerrar'
  | 'i-siguiente'
  | 'i-ok'
  | 'i-alerta';

interface AceroIconProps {
  id: AceroIconId;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

export const AceroIcon: React.FC<AceroIconProps> = ({
  id,
  className = '',
  size = 'md',
  title,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
  };

  return (
    <svg
      className={`inline-block shrink-0 fill-none stroke-current align-middle transition-colors ${sizeClasses[size]} ${className}`}
      aria-hidden={!title}
      role={title ? 'img' : 'presentation'}
    >
      {title && <title>{title}</title>}
      <use href={`/acero-iconos.svg#${id}`} />
    </svg>
  );
};
