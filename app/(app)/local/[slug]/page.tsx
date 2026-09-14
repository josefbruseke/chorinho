import Link from "next/link";
import { notFound } from "next/navigation";
import type { NextPage } from "next";
import { ArrowLeftIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { ColecaoDoLocal } from "~~/components/app/ColecaoDoLocal";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { VerifiedBadge } from "~~/components/vitrine/VerifiedBadge";
import { supabaseServer } from "~~/services/database/server";
import { getMetadata } from "~~/utils/metadata";
import { INICIO_DO_APP } from "~~/utils/rotas";
import { categoryInfo } from "~~/utils/vitrine";

type Props = { params: Promise<{ slug: string }> };

const buscarLocal = async (slug: string) => {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("establishments")
    .select("id, name, slug, description, category, neighborhood, city, state, address_line, phone, whatsapp")
    .eq("slug", slug)
    .maybeSingle();
  return data;
};

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params;
  const local = await buscarLocal(slug);
  return getMetadata({
    title: local?.name ?? "Local",
    description: local?.description ?? "Um comércio parceiro do Chorinho.",
  });
};

const Local: NextPage<Props> = async ({ params }) => {
  const { slug } = await params;
  const local = await buscarLocal(slug);

  // A RLS já filtra: visitante só enxerga loja ativa, então "não encontrado"
  // cobre tanto slug inexistente quanto loja suspensa.
  if (!local) notFound();

  const categoria = categoryInfo(local.category);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5 flex flex-col gap-5">
      <Link href={INICIO_DO_APP} className="btn btn-ghost h-12 rounded-2xl gap-1.5 self-start -ml-2">
        <ArrowLeftIcon className="w-5 h-5" />
        Voltar aos lugares
      </Link>

      <header className="flex gap-4 items-start">
        <span className="w-16 h-16 rounded-2xl bg-primary/10 text-brand-ink flex items-center justify-center shrink-0 border border-primary/20">
          <CategoryIcon iconKey={categoria.iconKey} className="w-8 h-8" />
        </span>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-serif font-black m-0 tracking-tight text-secondary">
              {local.name}
            </h1>
            <VerifiedBadge compact />
          </div>
          <span className="text-sm opacity-70">{categoria.label}</span>
        </div>
      </header>

      {local.description && <p className="m-0 leading-relaxed opacity-85">{local.description}</p>}

      <section className="rounded-box border border-base-300 bg-base-100 divide-y divide-base-300">
        {(local.address_line || local.neighborhood) && (
          <div className="flex gap-3 p-4">
            <MapPinIcon className="w-5 h-5 text-brand-ink shrink-0 mt-0.5" />
            <div className="text-base">
              {local.address_line && <span className="block">{local.address_line}</span>}
              <span className="text-sm opacity-70">
                {[local.neighborhood, local.city, local.state].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
        )}

        {/* Telefone é a ação principal desta seção — quem abre a ficha do local geralmente
            quer ligar ou confirmar algo, então o número ganha peso e a linha toda é tocável. */}
        {local.phone && (
          <a
            href={`tel:${local.phone}`}
            className="flex items-center gap-3 p-4 min-h-12 hover:bg-base-200 active:bg-base-200 transition-colors"
          >
            <PhoneIcon className="w-5 h-5 text-brand-ink shrink-0" />
            <span className="text-base font-bold text-secondary">{local.phone}</span>
          </a>
        )}
      </section>

      <ColecaoDoLocal establishmentId={local.id} />
    </div>
  );
};

export default Local;
