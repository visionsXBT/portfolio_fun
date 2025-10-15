import Image from "next/image";

interface LogoProps {
  size?: "default" | "large";
}

export default function Logo({ size = "default" }: LogoProps) {
  const isLarge = size === "large";
  
  return (
    <div className="flex items-center gap-3">
      <div className={`${isLarge ? 'w-32 h-16' : 'w-24 h-12'} relative rounded-lg flex items-center justify-center`}>
        <Image
          src="/logo.png"
          alt="onPort Logo"
          width={isLarge ? 400 : 300}
          height={isLarge ? 156 : 117}
          className="object-contain"
        />
      </div>
    </div>
  );
}