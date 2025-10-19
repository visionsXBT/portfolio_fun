import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "default" | "large";
}

export default function Logo({ size = "default" }: LogoProps) {
  const logoSize = size === "large" ? "w-40 h-20" : "w-24 h-12";
  
  return (
    <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
      <div className={`${logoSize} relative rounded-lg flex items-center justify-center`}>
        <Image
          src="/logo.png"
          alt="onPort Logo"
          width={400}
          height={156}
          className="object-contain"
        />
      </div>
    </Link>
  );
}