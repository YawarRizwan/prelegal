import { catalog, findBySlug, getSlug } from "../../lib/catalog";
import DocumentChat from "./DocumentChat";

export function generateStaticParams() {
  return catalog.map((doc) => ({ slug: getSlug(doc.filename) }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = findBySlug(slug);
  const documentName = entry?.name ?? slug.replace(/-/g, " ");
  return <DocumentChat slug={slug} documentName={documentName} />;
}
