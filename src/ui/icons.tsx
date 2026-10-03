import type { ReactNode } from 'react';

/**
 * Icons. Paths marked "OcheHub" are copied from `packages/assets/icons` in the
 * main repo so the feed matches the rest of the app; the rest are drawn to the
 * same weight for controls the icon set does not cover yet.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 20, viewBox, className, children }: IconProps & { viewBox: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      viewBox={viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/* OcheHub */
export const PlayIcon = (props: IconProps) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path d="M9 5L20 12L9 19V5Z" fill="currentColor" />
  </Svg>
);

/* OcheHub */
export const PauseIcon = (props: IconProps) => (
  <Svg viewBox="0 0 28 28" {...props}>
    <path d="M9.3335 5.83398V22.1673M18.6668 5.83398V22.1673" {...stroke} strokeWidth="3.5" />
  </Svg>
);

/* OcheHub */
export const BookmarkIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path
      d="M5 3.33398H15V17.5007L10 14.1673L5 17.5007V3.33398Z"
      fill={filled ? 'currentColor' : 'none'}
      {...stroke}
      strokeWidth="1.41667"
    />
  </Svg>
);

export const SearchIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <circle cx="8.75" cy="8.75" r="5.75" {...stroke} strokeWidth="1.7" />
    <path d="M13.2 13.2L17 17" {...stroke} strokeWidth="1.7" />
  </Svg>
);

export const CrossIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M5 5L15 15M15 5L5 15" {...stroke} strokeWidth="1.8" />
  </Svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M5 7.5L10 12.5L15 7.5" {...stroke} strokeWidth="1.8" />
  </Svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M12.5 5L7.5 10L12.5 15" {...stroke} strokeWidth="1.8" />
  </Svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M7.5 5L12.5 10L7.5 15" {...stroke} strokeWidth="1.8" />
  </Svg>
);

/* OcheHub */
export const NextTrackIcon = (props: IconProps) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path d="M6 5L16 12L6 19V5Z" fill="currentColor" />
    <path d="M19 5L19 19" {...stroke} strokeWidth="1.7" />
  </Svg>
);

/* OcheHub */
export const PreviousTrackIcon = (props: IconProps) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path d="M18 19L8 12L18 5V19Z" fill="currentColor" />
    <path d="M5 19L5 5" {...stroke} strokeWidth="1.7" />
  </Svg>
);

/* OcheHub */
export const VolumeIcon = (props: IconProps) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path d="M15 8C17.6 10.6667 17.6 13.3333 15 16M18 5C22.6 9.6 22.6 14.4 18 19M11 4L6 8H3V16H6L11 20V4Z" {...stroke} strokeWidth="1.7" />
  </Svg>
);

/* OcheHub */
export const VolumeMutedIcon = (props: IconProps) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path d="M11 4L6 8H3V16H6L11 20V4Z M15.5 9.5L20.5 14.5M20.5 9.5L15.5 14.5" {...stroke} strokeWidth="1.7" />
  </Svg>
);

export const ShareIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M10 12.5V3M10 3L6.5 6.5M10 3L13.5 6.5" {...stroke} strokeWidth="1.6" />
    <path d="M4 10V15.5C4 16.3 4.7 17 5.5 17H14.5C15.3 17 16 16.3 16 15.5V10" {...stroke} strokeWidth="1.6" />
  </Svg>
);

/* OcheHub (filter) */
export const TuneIcon = (props: IconProps) => (
  <Svg viewBox="0 0 17 17" {...props}>
    <rect fill="currentColor" height="2" rx="1" width="4" y="3" />
    <rect fill="currentColor" height="2" rx="1" width="9" x="8" y="3" />
    <rect fill="currentColor" height="2" rx="1" width="9" y="12" />
    <rect fill="currentColor" height="2" rx="1" width="4" x="13" y="12" />
    <path
      d="M8 4C8 2.89543 7.10457 2 6 2C4.89543 2 4 2.89543 4 4C4 5.10457 4.89543 6 6 6V8C3.79086 8 2 6.20914 2 4C2 1.79086 3.79086 0 6 0C8.20914 0 10 1.79086 10 4C10 6.20914 8.20914 8 6 8V6C7.10457 6 8 5.10457 8 4Z"
      fill="currentColor"
    />
    <path
      d="M13 13C13 11.8954 12.1046 11 11 11C9.89543 11 9 11.8954 9 13C9 14.1046 9.89543 15 11 15V17C8.79086 17 7 15.2091 7 13C7 10.7909 8.79086 9 11 9C13.2091 9 15 10.7909 15 13C15 15.2091 13.2091 17 11 17V15C12.1046 15 13 14.1046 13 13Z"
      fill="currentColor"
    />
  </Svg>
);

/* OcheHub */
export const MatchesIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path
      d="M9 0C13.9704 0.000184055 17.9999 4.0297 18 9C18 13.9704 13.9704 17.9998 9 18C4.02942 18 0 13.9705 0 9C9.32519e-05 4.02959 4.02948 0 9 0ZM9 1.60059C8.5993 1.60059 8.2057 1.63302 7.82227 1.69434C4.61158 2.20772 2.09177 4.78567 1.66504 8.02441C1.63831 8.22643 1.61951 8.43089 1.60938 8.6377C1.60358 8.75775 1.59961 8.87851 1.59961 9C1.59961 9.11813 1.60292 9.23576 1.6084 9.35254C1.62187 9.63393 1.65056 9.9113 1.69434 10.1836C1.88159 11.3485 2.34098 12.422 3.00488 13.3379C3.13545 13.518 3.27502 13.691 3.4209 13.8584C4.53084 15.1318 6.06806 16.0212 7.81055 16.3027H7.81152C7.95546 16.326 8.10048 16.3475 8.24707 16.3623H8.24512C8.49321 16.3874 8.74528 16.4004 9 16.4004C13.0868 16.4002 16.3994 13.0867 16.3994 9C16.3994 7.38519 15.8808 5.89232 15.0029 4.67578L14.8232 4.4375C14.3935 3.88994 13.8884 3.40485 13.3232 2.99707V2.99609C12.3518 2.29538 11.2043 1.82531 9.95898 1.66406C9.75918 1.63802 9.55701 1.61919 9.35254 1.60938C9.2357 1.60389 9.11819 1.60059 9 1.60059ZM10.0459 15.1729C9.70572 15.2301 9.35645 15.2617 9 15.2617C8.64303 15.2617 8.2928 15.2302 7.95215 15.1729L8.35742 11.9297C8.56439 11.9748 8.77949 12 9 12C9.21998 12 9.43412 11.9747 9.64062 11.9297L10.0459 15.1729ZM6.47461 10.6172C6.70822 10.9812 7.0179 11.2907 7.38184 11.5244L5.375 14.1035C4.80272 13.6963 4.30159 13.1964 3.89453 12.624L6.47461 10.6172ZM14.1035 12.624C13.6963 13.1965 13.1955 13.6963 12.623 14.1035L10.6172 11.5234C10.9808 11.2898 11.2899 10.9809 11.5234 10.6172L14.1035 12.624ZM8.99902 7.2002C9.99308 7.2002 10.7997 8.00598 10.7998 9C10.7998 9.9941 9.99314 10.7998 8.99902 10.7998C8.00512 10.7996 7.19922 9.99394 7.19922 9C7.19931 8.00613 8.00518 7.20045 8.99902 7.2002ZM6.06934 8.3584C6.02426 8.56516 6.00002 8.77973 6 9C6 9.22018 6.02431 9.43492 6.06934 9.6416L2.82617 10.0459C2.76899 9.70583 2.73828 9.35633 2.73828 9C2.7383 8.64325 2.76884 8.29358 2.82617 7.95312L6.06934 8.3584ZM15.1719 7.95312C15.2292 8.29363 15.2607 8.64319 15.2607 9C15.2607 9.35639 15.2291 9.70577 15.1719 10.0459L11.9287 9.6416C11.9738 9.43485 12 9.22026 12 9C12 8.77966 11.9738 8.56522 11.9287 8.3584L15.1719 7.95312ZM7.38184 6.47559C7.0179 6.70927 6.70825 7.01885 6.47461 7.38281L3.89453 5.37598C4.30172 4.80348 4.80251 4.30272 5.375 3.89551L7.38184 6.47559ZM12.623 3.89551C13.1954 4.30252 13.6963 4.80277 14.1035 5.375L11.5234 7.38281C11.2897 7.01883 10.9803 6.70921 10.6162 6.47559L12.623 3.89551ZM9 2.73926C9.35642 2.73929 9.70575 2.76992 10.0459 2.82715L9.64062 6.07031C9.43415 6.02535 9.21994 6.00004 9 6C8.77952 6 8.56436 6.02517 8.35742 6.07031L7.95215 2.82715C8.29278 2.76978 8.64305 2.73926 9 2.73926Z"
      fill="currentColor"
    />
  </Svg>
);

/* OcheHub (news glyph, used for Feed in the app nav) */
export const FeedIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path
      d="M14.1924 0C15.4669 4.20933e-05 16.5 1.07493 16.5 2.40039V15.5996C16.5 16.8837 15.5299 17.9328 14.3105 17.9971L14.1924 18H3.80762L3.68945 17.9971C2.50948 17.9349 1.5628 16.9508 1.50293 15.7236L1.5 15.5996V2.40039C1.5 1.07493 2.53315 4.22927e-05 3.80762 0H14.1924ZM3.80762 1.59961C3.38282 1.59965 3.03809 1.95859 3.03809 2.40039V15.5996C3.03809 16.0414 3.38282 16.4003 3.80762 16.4004H14.1924C14.6172 16.4003 14.9619 16.0414 14.9619 15.5996V2.40039C14.9619 1.95859 14.6172 1.59965 14.1924 1.59961H3.80762ZM12.2002 10C12.6419 10.0001 12.9999 10.3581 13 10.7998V13.7002C12.9999 14.1419 12.6419 14.4999 12.2002 14.5H5.7998C5.35813 14.4999 5.00011 14.1419 5 13.7002V10.7998C5.00011 10.3581 5.35813 10.0001 5.7998 10H12.2002ZM9.2002 6.75C9.64187 6.75011 9.99989 7.10813 10 7.5498V7.7002C9.99989 8.14187 9.64187 8.49989 9.2002 8.5H5.7998C5.35813 8.49989 5.00011 8.14187 5 7.7002V7.5498C5.00011 7.10813 5.35813 6.75011 5.7998 6.75H9.2002ZM12.2002 3.5C12.6419 3.50011 12.9999 3.85813 13 4.2998V4.4502C12.9999 4.89187 12.6419 5.24989 12.2002 5.25H5.7998C5.35813 5.24989 5.00011 4.89187 5 4.4502V4.2998C5.00011 3.85813 5.35813 3.50011 5.7998 3.5H12.2002Z"
      fill="currentColor"
    />
  </Svg>
);

/* OcheHub */
export const YouIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path
      d="M12.6279 10.2012C14.0095 10.6299 15.3321 11.3077 16.5244 12.2383C17.4559 12.9653 17.9999 14.0811 18 15.2627V18H0V15.2627C9.10909e-05 14.0814 0.544459 12.9653 1.47559 12.2383C2.63794 11.3311 3.92471 10.6647 5.26855 10.2344C5.88718 10.7564 6.60053 11.1489 7.37598 11.376C5.62696 11.6459 3.93044 12.3532 2.46094 13.5C1.91819 13.9238 1.5997 14.5741 1.59961 15.2627V16.4004H16.4004V15.2627C16.4003 14.574 16.0829 13.9238 15.54 13.5C14.0436 12.3322 12.3123 11.6208 10.5293 11.3623C11.3028 11.1284 12.0129 10.729 12.6279 10.2012ZM9.02832 0C11.8054 0 14.0565 2.23876 14.0566 5L14.0508 5.25684C13.9163 7.89883 11.7188 10 9.02832 10L8.97852 9.99805C8.96232 9.99826 8.9459 10 8.92969 10C8.73086 9.99999 8.53366 9.98271 8.33887 9.95215C5.97174 9.62915 4.12963 7.66895 4.00684 5.25684L4 5C4.00017 2.2389 6.25145 0.000225207 9.02832 0ZM9.02832 1.59961C7.12649 1.59983 5.59978 3.13112 5.59961 5C5.59965 6.86899 7.12641 8.39919 9.02832 8.39941C10.9304 8.39941 12.457 6.86912 12.457 5C12.4569 3.13098 10.9303 1.59961 9.02832 1.59961Z"
      fill="currentColor"
    />
  </Svg>
);

/* OcheHub */
export const GearIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path
      d="M4.36035 1.69833C5.72841 0.227959 7.81599 -0.343461 9.74609 0.20517L16.2842 2.06454L17.8623 8.76767C18.2852 10.5648 17.7204 12.4417 16.3896 13.7188L12.8633 17.1017C12.2597 17.6807 11.4554 18.0001 10.624 18.0001H10.5801L10.5361 17.9972L0.894531 17.4864L0.00683594 7.78232L0 7.70615V7.63095C4.97387e-05 6.8257 0.307342 6.05396 0.852539 5.46786L4.36035 1.69833ZM9.29199 1.80478C7.95603 1.42497 6.51504 1.82217 5.57715 2.83017L2.07031 6.60165C1.80868 6.88297 1.66314 7.25007 1.66309 7.63095L2.3125 14.7433L12.5605 5.17001L3.99707 15.9845L10.624 16.337C11.0305 16.337 11.4212 16.1803 11.7119 15.9015L15.2373 12.5186C16.0916 11.6989 16.4803 10.5247 16.2891 9.37704L16.2432 9.14951L14.8896 3.39658L9.29199 1.80478Z"
      fill="currentColor"
    />
  </Svg>
);

/* OcheHub */
export const ArrowRightIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path d="M3.75 9H14.25M10.5 12.75L14.25 9L10.5 5.25" {...stroke} strokeWidth="1.5" />
  </Svg>
);

export const ExternalIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path d="M6 12L12.5 5.5M12.5 5.5H7.25M12.5 5.5V10.75" {...stroke} strokeWidth="1.6" />
  </Svg>
);

export const CheckIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path d="M4 9.5L7.5 13L14 5.5" {...stroke} strokeWidth="2" />
  </Svg>
);

export const PlusIcon = (props: IconProps) => (
  <Svg viewBox="0 0 18 18" {...props}>
    <path d="M9 4V14M4 9H14" {...stroke} strokeWidth="1.8" />
  </Svg>
);

export const ListIcon = (props: IconProps) => (
  <Svg viewBox="0 0 20 20" {...props}>
    <path d="M7 5.5H16M7 10H16M7 14.5H16" {...stroke} strokeWidth="1.7" />
    <circle cx="3.75" cy="5.5" fill="currentColor" r="1" />
    <circle cx="3.75" cy="10" fill="currentColor" r="1" />
    <circle cx="3.75" cy="14.5" fill="currentColor" r="1" />
  </Svg>
);

/** Circular skip arrow with the number of seconds inside. */
export function SkipIcon({ seconds, back, size = 28 }: { seconds: number; back?: boolean; size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" height={size} viewBox="0 0 28 28" width={size}>
      <g transform={back ? 'translate(28 0) scale(-1 1)' : undefined}>
        <path d="M14 5.5A8.75 8.75 0 1 1 6.2 10.3" {...stroke} strokeWidth="1.8" />
        <path d="M14 2.2L17.2 5.5L14 8.8" {...stroke} strokeWidth="1.8" />
      </g>
      <text
        fill="currentColor"
        fontFamily="var(--font-display)"
        fontSize="8.5"
        fontWeight="700"
        textAnchor="middle"
        x="14"
        y="17.6"
      >
        {seconds}
      </text>
    </svg>
  );
}

/* Kind glyphs */
export const VideoGlyph = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <rect height="10" rx="2.5" width="13" x="1.5" y="3" {...stroke} strokeWidth="1.5" />
    <path d="M6.75 5.9L10.25 8L6.75 10.1V5.9Z" fill="currentColor" />
  </Svg>
);

export const ShortGlyph = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <rect height="13" rx="2.5" width="8.5" x="3.75" y="1.5" {...stroke} strokeWidth="1.5" />
    <path d="M7 6L10 8L7 10V6Z" fill="currentColor" />
  </Svg>
);

export const PodcastGlyph = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <rect height="7" rx="2.25" width="4.5" x="5.75" y="1.5" {...stroke} strokeWidth="1.5" />
    <path d="M3.25 7.5C3.25 10.1 5.4 11.75 8 11.75C10.6 11.75 12.75 10.1 12.75 7.5M8 11.75V14.5" {...stroke} strokeWidth="1.5" />
  </Svg>
);

export const NewsGlyph = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <rect height="12" rx="2" width="11" x="2.5" y="2" {...stroke} strokeWidth="1.5" />
    <path d="M5.25 5.5H10.75M5.25 8H10.75M5.25 10.5H8.25" {...stroke} strokeWidth="1.4" />
  </Svg>
);

export const SocialGlyph = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <path
      d="M2.5 4.5C2.5 3.4 3.4 2.5 4.5 2.5H11.5C12.6 2.5 13.5 3.4 13.5 4.5V9C13.5 10.1 12.6 11 11.5 11H7.5L4.5 13.5V11C3.4 11 2.5 10.1 2.5 9V4.5Z"
      {...stroke}
      strokeWidth="1.5"
    />
  </Svg>
);

export const BoltIcon = (props: IconProps) => (
  <Svg viewBox="0 0 16 16" {...props}>
    <path d="M9 1.5L3.5 9H7.5L7 14.5L12.5 7H8.5L9 1.5Z" fill="currentColor" />
  </Svg>
);
