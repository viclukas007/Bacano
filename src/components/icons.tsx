type IconProps = {
  className?: string;
  size?: number;
};

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true as const,
    focusable: "false" as const,
    className,
  };
}

export function IconYouTube({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconInstagram({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTikTok({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeLinejoin="round">
      <circle cx="9" cy="17" r="3.5" />
      <path d="M12.5 17V3.5c1 2.4 2.7 3.6 5 3.7" />
    </svg>
  );
}

export function IconSpotify({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2} strokeLinecap="round">
      <path d="M5 9.5c4.5-2 9-2 13.5 0" />
      <path d="M6.5 13c3.6-1.5 7.4-1.5 11 0" />
      <path d="M8 16.3c2.7-1.1 5.3-1.1 8 0" />
    </svg>
  );
}

export function IconPlay({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor" />
    </svg>
  );
}

/** El logo de WhatsApp, relleno: dibujado a trazo no se reconoce. */
export function IconWhatsApp({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  );
}

export function IconFlecha({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.4} strokeLinecap="square">
      <path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" />
    </svg>
  );
}

export function IconMenu({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.2} strokeLinecap="square">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconCerrar({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.2} strokeLinecap="square">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export const iconosRed = {
  YouTube: IconYouTube,
  Instagram: IconInstagram,
  TikTok: IconTikTok,
  Spotify: IconSpotify,
} as const;
