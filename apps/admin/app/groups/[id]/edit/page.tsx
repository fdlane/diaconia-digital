import { GroupFormPage } from "../../../../src/GroupFormPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupFormPage id={id} />;
}
