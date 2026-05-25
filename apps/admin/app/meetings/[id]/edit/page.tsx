import { MeetingFormPage } from "../../../../src/MeetingFormPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingFormPage id={id} />;
}
