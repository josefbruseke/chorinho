import type { NextPage } from "next";
import { ListaDeLugares } from "~~/components/app/ListaDeLugares";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Lugares do bairro",
  description: "Os comércios que participam do Chorinho, em lista.",
});

const Explorar: NextPage = () => <ListaDeLugares />;

export default Explorar;
