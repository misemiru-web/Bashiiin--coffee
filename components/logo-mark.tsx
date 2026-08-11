type LogoMarkProps = {
  size?: "small" | "large";
};

export function LogoMark({ size = "small" }: LogoMarkProps) {
  return (
    <span className={`logo-mark logo-mark--${size}`} aria-hidden="true">
      <svg viewBox="0 0 100 78" role="img">
        <g className="logo-mark__hands">
          <path d="M8 38c-3-2-2-7 2-7l27 12L14 24c-3-2 0-7 3-5l27 17L22 14c-3-3 1-7 4-4l25 22L35 8c-2-4 3-6 5-2l19 28c4 6 2 13-3 18l-7 7c-6 6-14 7-21 2L8 45c-3-2-3-6 0-7Z" />
          <path d="M92 38c3-2 2-7-2-7L63 43l23-19c3-2 0-7-3-5L56 36l22-22c3-3-1-7-4-4L49 32 65 8c2-4-3-6-5-2L41 34c-4 6-2 13 3 18l7 7c6 6 14 7 21 2l20-16c3-2 3-6 0-7Z" />
        </g>
        <path className="logo-mark__line" d="M8 15 1 9M12 62l-8 5M50 7V0M92 15l7-6M88 62l8 5" />
      </svg>
    </span>
  );
}
