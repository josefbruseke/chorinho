import Link from "next/link";
import { BrandLogo } from "~~/components/BrandLogo";
import { FlavorTheme } from "~~/components/FlavorTheme";

/**
 * Flavor privacy: documentos legais. Chrome mínimo de propósito — alto
 * contraste, coluna estreita e sem distração, para ler e imprimir bem.
 */
const LegalLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-[100dvh] bg-base-100">
    <header className="border-b border-base-300 print:hidden">
      <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5 min-h-12 group">
          <BrandLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
          <span className="font-black tracking-tight">Chorinho</span>
        </Link>
      </div>
    </header>

    <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10">{children}</main>

    <footer className="border-t border-base-300 print:hidden">
      {/* min-h-12 em cada link: rodapé é a navegação legal inteira num celular na mão de alguém — não pode exigir precisão de mira. */}
      <div className="max-w-3xl mx-auto px-5 py-3 flex flex-wrap gap-x-2 gap-y-1 text-sm font-semibold text-base-content/70">
        <Link
          href="/privacidade"
          className="flex items-center min-h-12 px-2 rounded-xl hover:bg-base-200 hover:text-brand-ink transition-colors"
        >
          Privacidade
        </Link>
        <Link
          href="/termos"
          className="flex items-center min-h-12 px-2 rounded-xl hover:bg-base-200 hover:text-brand-ink transition-colors"
        >
          Termos de uso
        </Link>
        <Link
          href="/cookies"
          className="flex items-center min-h-12 px-2 rounded-xl hover:bg-base-200 hover:text-brand-ink transition-colors"
        >
          Cookies
        </Link>
      </div>
    </footer>
  </FlavorTheme>
);

export default LegalLayout;
