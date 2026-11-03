"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Eye, EyeOff, Plus, Pencil } from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { useToast } from "@/context/FeedbackContext";
import { formatPrice } from "@/lib/utils";
import StatusPill from "@/components/admin/StatusPill";
import {
  PRODUCT_INITIAL_VALUES,
  productFormFields,
  type SelectOption,
} from "@/lib/admin/product-form";

interface AdminProduct extends Record<string, unknown> {
  id: string;
  sku: string;
  part_number?: string;
  name: string;
  slug: string;
  gender: string;
  machine_brands?: string[];
  category: string | { id: string; name: string; slug: string };
  brand: string | null;
  collection: string | null;
  price: string | number;
  compare_at_price: string | number | null;
  cost_price: string | number | null;
  currency: string;
  images: string[];
  description: string;
  short_description: string;
  material: string;
  care_instructions: string[];
  fit: string;
  tags: string[];
  status: string;
  rating: string | number;
  review_count: number;
  total_stock: number;
  is_new: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  is_limited: boolean;
  specifications: Record<string, string>;
  features: string[];
  seo_title: string;
  seo_description: string;
  // Variants — Django ProductWriteSerializer accepts these inline.
  colors: Array<{ id?: string; name: string; hex: string; image?: string; order?: number }>;
  sizes: Array<{ id?: string; label: string; order?: number }>;
}

const columns: Column<AdminProduct>[] = [
  {
    key: "product",
    header: "Product",
    sortable: true,
    accessor: (p) => p.name,
    render: (p) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-11 w-9 shrink-0 overflow-hidden rounded bg-bone">
          {p.images?.[0] && (
            <Image
              src={p.images[0]}
              alt=""
              width={36}
              height={44}
              className="h-full w-full object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-navy truncate">{p.name}</p>
          <p className="text-[11px] text-ink/45 tabular">{p.sku}</p>
        </div>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    sortable: true,
    accessor: (p) =>
      typeof p.category === "string" ? p.category : p.category?.slug ?? "",
    render: (p) => (
      <span className="text-sm text-ink/70 capitalize">
        {typeof p.category === "string" ? p.category : p.category?.name ?? "—"}
      </span>
    ),
  },
  {
    key: "part",
    header: "Part / Fits",
    sortable: false,
    accessor: (p) => p.part_number ?? "",
    render: (p) => (
      <div className="min-w-0">
        {p.part_number && (
          <p className="text-[11px] text-navy tabular truncate">{p.part_number}</p>
        )}
        <p className="text-[10px] tracking-[0.14em] uppercase text-ink/50 truncate">
          {(p.machine_brands ?? []).slice(0, 3).join(" · ") || "universal"}
        </p>
      </div>
    ),
  },
  {
    key: "stock",
    header: "Stock",
    sortable: true,
    align: "right",
    accessor: (p) => p.total_stock,
    render: (p) => {
      const total = p.total_stock ?? 0;
      const tone =
        total === 0
          ? "text-rose-700"
          : total < 20
          ? "text-amber-700"
          : "text-navy";
      return <span className={`tabular text-sm ${tone}`}>{total}</span>;
    },
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    align: "right",
    accessor: (p) => Number(p.price),
    render: (p) => (
      <span className="tabular text-sm text-navy">
        {formatPrice(Number(p.price), p.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    accessor: (p) => p.status,
    render: (p) => <StatusPill status={p.status} />,
  },
];

export default function AdminProducts() {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [collections, setCollections] = useState<SelectOption[]>([]);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      djangoAdmin.categories.list(),
      djangoAdmin.brands.list(),
      djangoAdmin.collections.list(),
    ])
      .then(([cats, brs, cols]) => {
        const toOptions = (data: unknown): SelectOption[] => {
          const items =
            (data as { results?: Array<{ id: string; name: string }> }).results ??
            (data as Array<{ id: string; name: string }>);
          return items.map((x) => ({ value: x.id, label: x.name }));
        };
        setCategories(toOptions(cats));
        setBrands(toOptions(brs));
        setCollections(toOptions(cols));
      })
      .catch(() => {});
  }, []);

  return (
    <ResourceManager<AdminProduct>
      eyebrow="Catalog"
      title="Products"
      singular="product"
      description="The full house catalog. Create, edit, and manage SKUs across the storefront. Drafts are hidden from customers — publish a product to make it visible."
      client={djangoAdmin.products as unknown as CrudClient<AdminProduct>}
      rowKey={(p) => p.slug}
      rowLabel={(p) => p.name}
      columns={columns}
      searchPlaceholder="Search by name or SKU…"
      searchAccessor={(p) =>
        `${p.name} ${p.sku} ${typeof p.category === "string" ? p.category : ""}`
      }
      pageSize={12}
      extraActions={() => (
        <>
          <button
            type="button"
            onClick={async () => {
              try {
                const file = await djangoAdmin.products.exportCsv();
                toast.success("Exported", file);
              } catch (e) {
                toast.error("Couldn't export", (e as Error).message);
              }
            }}
            className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
          >
            <Download size={13} />
            Export CSV
          </button>
          <Link
            href="/admin/products/new"
            className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:bg-navy-deep transition-colors flex items-center gap-2"
          >
            <Plus size={13} />
            New part
          </Link>
        </>
      )}
      customActions={(p, refresh) => {
        const editLink = (
          <Link
            href={`/admin/products/${p.slug}/edit`}
            onClick={(e) => e.stopPropagation()}
            title="Edit part"
            className="h-7 px-2 inline-flex items-center gap-1 rounded text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-[#FAFAFA] transition-colors"
          >
            <Pencil size={12} />
            Edit
          </Link>
        );
        const toggle =
          p.status === "active" ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await djangoAdmin.products.update(p.slug, { status: "draft" });
                await refresh();
              }}
              title="Unpublish — hide from storefront"
              className="h-7 px-2 inline-flex items-center gap-1 rounded text-[11px] tracking-[0.18em] uppercase text-ink/60 hover:text-navy hover:bg-[#FAFAFA] transition-colors"
            >
              <EyeOff size={12} />
              Unpublish
            </button>
          ) : p.status === "draft" ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await djangoAdmin.products.update(p.slug, { status: "active" });
                await refresh();
              }}
              title="Publish — show on storefront"
              className="h-7 px-2 inline-flex items-center gap-1 rounded text-[11px] tracking-[0.18em] uppercase text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
            >
              <Eye size={12} />
              Publish
            </button>
          ) : null;
        return (
          <div className="flex items-center gap-1">
            {editLink}
            {toggle}
          </div>
        );
      }}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "active", label: "Active", predicate: (p) => p.status === "active" },
        { key: "draft", label: "Draft", predicate: (p) => p.status === "draft" },
        { key: "archived", label: "Archived", predicate: (p) => p.status === "archived" },
        { key: "lowstock", label: "Low stock", predicate: (p) => (p.total_stock ?? 0) < 20 },
      ]}
      initialValues={PRODUCT_INITIAL_VALUES}
      fields={productFormFields({ categories, brands, collections })}
    />
  );
}
