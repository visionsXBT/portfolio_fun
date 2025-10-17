import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "default" | "large";
}

export default function Logo({ size = "default" }: LogoProps) {
  const isLarge = size === "large";
  
  return (
    <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
      <div className={`${isLarge ? 'w-32 h-16' : 'w-24 h-12'} relative rounded-lg flex items-center justify-center`}>
        <Image
          src="/logo.png"
          alt="onPort Logo"
          width={isLarge ? 400 : 300}
          height={isLarge ? 156 : 117}
          className="object-contain"
        />
      </div>
    </Link>
  );
}