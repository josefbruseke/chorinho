import Link from "next/link";
import { BrandLogo } from "~~/components/BrandLogo";
import { FlavorTheme } from "~~/components/FlavorTheme";

/**
 * Flavor privacy: documentos legais. Chrome mínimo de propósito — alto
 * contraste, coluna estreita e sem distração, para ler e imprimir bem.
 */
const LegalLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-screen bg-base-100">
    <header className="border-b border-base-300 print:hidden">
      <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
          <span className="font-black tracking-tight">Chorinho</span>
        </Link>
      </div>
    </header>

    <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10">{children}</main>

    <footer className="border-t border-base-300 print:hidden">
      <div className="max-w-3xl mx-auto px-5 py-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-base-content/70">
        <Link href="/privacidade" className="hover:text-primary transition-colors">
          Privacidade
        </Link>
        <Link href="/termos" className="hover:text-primary transition-colors">
          Termos de uso
        </Link>
        <Link href="/carteira-e-seguranca" className="hover:text-primary transition-colors">
          Carteira e segurança
        </Link>
        <Link href="/cookies" className="hover:text-primary transition-colors">
          Cookies
        </Link>
      </div>
    </footer>
  </FlavorTheme>
);

export default LegalLayout;
