import Logo from "@/components/Logo";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 p-4 sm:p-6 md:p-8">
        <Logo size="large" />
      </div>
      {/* Hero section */}
      <section className="px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl lg:max-w-5xl xl:max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm sm:text-base mb-6 sm:mb-8">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--brand-end)]" />
            Build portfolios of any kind with onPort
          </div>
          
          {/* Hero Image */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 flex justify-center">
            <Image
              src="/header_text.png"
              alt="Shill your bags in a fun way. No matter the chain."
              width={1200}
              height={600}
              className="max-w-full h-auto w-full max-w-4xl ml-24"
              priority
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <a href="/builder" className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 text-sm sm:text-base md:text-lg font-medium text-white transition-colors">
              Open portfolio builder
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}