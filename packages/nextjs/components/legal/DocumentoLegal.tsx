import { CalendarDaysIcon } from "@heroicons/react/24/outline";

/**
 * Casca comum dos documentos legais: título, data de vigência, sumário
 * opcional e uma coluna de leitura com hierarquia clara. Legível na tela e no
 * papel — a `/privacidade` costuma ser impressa e anexada em contrato de
 * lojista.
 */
export const DocumentoLegal = ({
  titulo,
  resumo,
  vigenteDesde,
  sumario,
  children,
}: {
  titulo: string;
  resumo: string;
  vigenteDesde: string;
  /** Índice de seções (id da âncora + título). Some sozinho em textos curtos — sem sumário não há o que navegar. */
  sumario?: { id: string; titulo: string }[];
  children: React.ReactNode;
}) => (
  <article className="max-w-prose mx-auto flex flex-col gap-8 sm:gap-10">
    <header className="flex flex-col gap-3 pb-6 border-b border-base-300">
      <h1 className="text-3xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
        {titulo}
      </h1>
      <p className="m-0 text-base-content/75 leading-relaxed text-balance">{resumo}</p>
      <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-base-content/70">
        <CalendarDaysIcon className="w-4 h-4" />
        Em vigor desde {vigenteDesde}
      </p>
    </header>

    {sumario && sumario.length > 0 && (
      <nav
        aria-label="Sumário"
        className="rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:p-5 flex flex-col gap-3 print:hidden"
      >
        <span className="text-xs font-black uppercase tracking-wider text-base-content/70">Neste documento</span>
        <ol className="list-none m-0 p-0 grid sm:grid-cols-2 gap-1">
          {sumario.map(({ id, titulo: tituloSecao }, i) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex items-center gap-2.5 min-h-12 px-2.5 rounded-xl text-sm font-semibold text-base-content/85 hover:bg-base-100 hover:text-brand-ink transition-colors"
              >
                <span className="text-xs font-mono font-black text-brand-ink/70 shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {tituloSecao}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    )}

    <div
      className="flex flex-col gap-8 sm:gap-10 leading-relaxed
        [&_h2]:font-serif [&_h2]:font-extrabold [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:text-secondary [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-base-300
        [&_h3]:font-bold [&_h3]:text-base [&_h3]:text-secondary [&_h3]:m-0 [&_h3]:mb-1
        [&_p]:m-0 [&_p]:text-base-content/85
        [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5
        [&_li]:text-base-content/85
        [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_section]:scroll-mt-6
        [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2"
    >
      {children}
    </div>
  </article>
);

/** Aviso destacado dentro de um documento. `tone="critico"` para o que exige atenção imediata (golpes, segurança da carteira). */
export const AvisoLegal = ({
  titulo,
  tone = "aviso",
  children,
}: {
  titulo: string;
  tone?: "aviso" | "critico";
  children: React.ReactNode;
}) => (
  <aside
    className={`rounded-box border-2 p-4 sm:p-5 flex flex-col gap-2 ${
      tone === "critico" ? "border-warning bg-warning/10" : "border-primary/30 bg-primary/5"
    }`}
  >
    <strong className="font-serif font-extrabold text-base sm:text-lg text-secondary">{titulo}</strong>
    <div className="text-sm text-base-content/85 flex flex-col gap-2 leading-relaxed">{children}</div>
  </aside>
);
