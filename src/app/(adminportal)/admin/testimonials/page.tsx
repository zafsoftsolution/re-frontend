"use client";

import { Star } from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface Testimonial extends Record<string, unknown> {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  image: string;
  date: string;
  is_verified: boolean;
  is_featured: boolean;
  is_published: boolean;
}

const columns: Column<Testimonial>[] = [
  {
    key: "guest",
    header: "Guest",
    sortable: true,
    accessor: (t) => t.name,
    render: (t) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{t.name}</p>
        <p className="text-[11px] text-ink/55 truncate">
          {[t.role, t.location].filter(Boolean).join(" · ")}
        </p>
      </div>
    ),
  },
  {
    key: "quote",
    header: "Quote",
    accessor: (t) => t.quote,
    render: (t) => (
      <p className="text-sm text-ink/75 line-clamp-2 italic">&ldquo;{t.quote}&rdquo;</p>
    ),
  },
  {
    key: "rating",
    header: "Rating",
    sortable: true,
    accessor: (t) => t.rating,
    render: (t) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={i <= t.rating ? "fill-gold text-gold" : "text-ink/20"}
          />
        ))}
      </div>
    ),
  },
  {
    key: "flags",
    header: "Flags",
    accessor: (t) => `${t.is_featured ? "f" : ""}${t.is_verified ? "v" : ""}`,
    render: (t) => (
      <div className="flex gap-1.5">
        {t.is_featured && (
          <span className="text-[10px] tracking-[0.2em] uppercase text-gold">
            Featured
          </span>
        )}
        {t.is_verified && (
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-700">
            Verified
          </span>
        )}
      </div>
    ),
  },
  {
    key: "date",
    header: "Date",
    sortable: true,
    accessor: (t) => t.date,
    render: (t) => (
      <span className="text-sm text-ink/65">{t.date ? formatDate(t.date) : "—"}</span>
    ),
  },
];

export default function AdminTestimonials() {
  return (
    <ResourceManager<Testimonial>
      eyebrow="Content"
      title="Testimonials"
      description="Curated quotes for the storefront."
      client={djangoAdmin.testimonials as CrudClient<Testimonial>}
      rowKey={(t) => t.id}
      rowLabel={(t) => `${t.name}'s testimonial`}
      columns={columns}
      searchPlaceholder="Search testimonials…"
      searchAccessor={(t) => `${t.name} ${t.location} ${t.quote}`}
      initialValues={{ rating: 5, is_published: true }}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "rating", label: "Rating", type: "number", required: true, hint: "1–5" },
        { name: "role", label: "Role", type: "text" },
        { name: "location", label: "Location", type: "text" },
        { name: "image", label: "Portrait", type: "imageUrl", full: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "quote", label: "Quote", type: "textarea", required: true, full: true, rows: 5 },
        { name: "is_verified", label: "Verified", type: "boolean" },
        { name: "is_featured", label: "Featured", type: "boolean" },
        { name: "is_published", label: "Published", type: "boolean" },
      ]}
    />
  );
}
