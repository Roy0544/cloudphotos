import React from 'react';

interface PhotosLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export function PhotosLogo({ className = 'w-6 h-6', size, ...props }: PhotosLogoProps) {
  return (
    <svg
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 350 350"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <defs>
        <radialGradient
          id="photos-logo-a"
          cx="173.161"
          cy="178.716"
          fx="239.836"
          fy="36.176"
          r="170.886"
          gradientTransform="matrix(1 0 0 1.041 0 -7.272)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".469" stopColor="#7acaff" />
          <stop offset=".828" stopColor="#00b054" />
        </radialGradient>
        <radialGradient
          id="photos-logo-b"
          cx="173.161"
          cy="178.716"
          fx="239.836"
          fy="36.176"
          r="170.886"
          gradientTransform="matrix(0 1 -1.041 0 357.272 0)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".545" stopColor="#fded1c" />
          <stop offset=".828" stopColor="#feca01" />
        </radialGradient>
        <radialGradient
          id="photos-logo-c"
          cx="173.161"
          cy="178.716"
          fx="239.836"
          fy="36.176"
          r="170.886"
          gradientTransform="matrix(-1 0 0 -1.041 350 357.272)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".469" stopColor="#ff81d0" />
          <stop offset=".828" stopColor="#ff4041" />
        </radialGradient>
        <radialGradient
          id="photos-logo-d"
          cx="173.161"
          cy="178.716"
          fx="239.836"
          fy="36.176"
          r="170.886"
          gradientTransform="matrix(0 -1 1.041 0 -7.272 350)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".469" stopColor="#aaa7ff" />
          <stop offset=".828" stopColor="#2f89ff" />
        </radialGradient>
      </defs>
      <path
        d="M79.6 262.5c0-48.3 39.2-87.5 87.5-87.5h7.9v167.1c0 4.4-3.6 7.9-7.9 7.9-48.3 0-87.5-39.2-87.5-87.5z"
        fill="url(#photos-logo-a)"
      />
      <path
        d="M87.5 79.6c48.3 0 87.5 39.2 87.5 87.5v7.9H7.9c-4.4 0-7.9-3.6-7.9-7.9 0-48.3 39.2-87.5 87.5-87.5z"
        fill="url(#photos-logo-b)"
      />
      <path
        d="M270.4 87.5c0 48.3-39.2 87.5-87.5 87.5H175V7.9c0-4.4 3.6-7.9 7.9-7.9 48.3 0 87.5 39.2 87.5 87.5z"
        fill="url(#photos-logo-c)"
      />
      <path
        d="M262.5 270.4c-48.3 0-87.5-39.2-87.5-87.5V175h167.1c4.4 0 7.9 3.6 7.9 7.9 0 48.3-39.2 87.5-87.5 87.5z"
        fill="url(#photos-logo-d)"
      />
    </svg>
  );
}
