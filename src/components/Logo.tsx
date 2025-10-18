import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "default" | "large";
}

export default function Logo({ size }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-32 h-16 relative rounded-lg flex items-center justify-center">
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