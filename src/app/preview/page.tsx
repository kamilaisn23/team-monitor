import { PreviewWorkspace } from "@/components/preview/PreviewWorkspace";
import { getPreviewSection } from "@/components/preview/navigation";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const params = await searchParams;
  return <PreviewWorkspace section={getPreviewSection(params.section)} />;
}
