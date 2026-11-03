import AdminProductForm from "@/components/admin/AdminProductForm";

export default async function AdminEditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminProductForm mode="edit" slug={id} />;
}
