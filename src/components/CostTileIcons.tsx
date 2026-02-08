import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlaneTakeoffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 18h20" />
      <path d="M3 11l9 2 6-6 3 1-5 7 3 2" />
    </IconBase>
  );
}

export function LuggageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="7" width="14" height="13" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M12 12v4" />
    </IconBase>
  );
}

export function BedDoubleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11v9" />
      <path d="M21 11v9" />
      <path d="M3 16h18" />
      <rect x="4" y="6" width="7" height="5" rx="1" />
      <rect x="13" y="6" width="7" height="5" rx="1" />
    </IconBase>
  );
}

export function CarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 13l2-5h14l2 5" />
      <rect x="3" y="13" width="18" height="5" rx="1" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </IconBase>
  );
}

export function UtensilsCrossedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3v8" />
      <path d="M4 3v4" />
      <path d="M8 3v4" />
      <path d="M6 11v10" />
      <path d="M18 3l-4 8" />
      <path d="M14 3l4 8" />
      <path d="M16 11v10" />
    </IconBase>
  );
}

export function TicketIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4z" />
      <path d="M12 7v10" />
    </IconBase>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </IconBase>
  );
}
