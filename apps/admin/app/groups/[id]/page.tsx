import { GroupDetailPage } from "../../../src/GroupDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailPage id={id} />;
}
