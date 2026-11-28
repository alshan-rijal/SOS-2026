import Link from "next/link";
import Image from "next/image";
import logoMark from "../app/business-images/Community Spark Location Pin.png";

// Brand mark. `href` may be null to render a non-link logo (e.g. inside a card).
export default function Logo({ href = "/", compact = false, className = "", textClassName = "" }) {
  const inner = (
    <>
      <Image
        src={logoMark}
        alt=""
        priority
        className="h-8 w-8 shrink-0 object-contain"
      />
      <span className={`text-base font-bold tracking-tight text-ink ${textClassName}`}>
        Sajha Pahal
        {compact ? null : (
          <span className="sr-only"> — community problem reporting</span>
        )}
      </span>
    </>
  );

  if (!href) {
    return (
      <span className={`flex items-center gap-2.5 ${className}`}>{inner}</span>
    );
  }

  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      {inner}
    </Link>
  );
}
