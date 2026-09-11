import { CalendarDaysIcon } from "@heroicons/react/24/outline";

/**
 * Casca comum dos documentos legais: título, data de vigência e uma coluna de
 * leitura com hierarquia clara. Legível na tela e no papel — a `/privacidade`
 * costuma ser impressa e anexada em contrato de lojista.
 */
export const DocumentoLegal = ({
  titulo,
  resumo,
  vigenteDesde,
  children,
}: {
  titulo: string;
  resumo: string;
  vigenteDesde: string;
  children: React.ReactNode;
}) => (
  <article className="flex flex-col gap-6">
    <header className="flex flex-col gap-3 pb-6 border-b border-base-300">
      <h1 className="text-3xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary">{titulo}</h1>
      <p className="m-0 text-base-content/75 leading-relaxed text-balance">{resumo}</p>
      <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-base-content/60">
        <CalendarDaysIcon className="w-4 h-4" />
        Em vigor desde {vigenteDesde}
      </p>
    </header>

    <div
      className="flex flex-col gap-6 leading-relaxed
        [&_h2]:font-serif [&_h2]:font-extrabold [&_h2]:text-xl [&_h2]:text-secondary [&_h2]:m-0 [&_h2]:mb-2
        [&_h3]:font-bold [&_h3]:text-base [&_h3]:text-secondary [&_h3]:m-0 [&_h3]:mb-1
        [&_p]:m-0 [&_p]:text-base-content/85
        [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5
        [&_li]:text-base-content/85
        [&_section]:flex [&_section]:flex-col [&_section]:gap-2.5
        [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
    >
      {children}
    </div>
  </article>
);

/** Aviso destacado dentro de um documento. */
export const AvisoLegal = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <aside className="rounded-box border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-1.5">
    <strong className="font-serif font-extrabold text-secondary">{titulo}</strong>
    <div className="text-sm text-base-content/85 flex flex-col gap-2">{children}</div>
  </aside>
);
