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
