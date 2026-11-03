"use client";

import { Star } from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface Review extends Record<string, unknown> {
  id: string;
  product: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  fit: string;
  is_verified: boolean;
  is_published: boolean;
  helpful_count: number;
  created_at: string;
}

const columns: Column<Review>[] = [
  {
    key: "review",
    header: "Review",
    sortable: true,
    accessor: (r) => r.title,
    render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{r.title}</p>
        <p className="text-[11px] text-ink/55 line-clamp-1 mt-0.5">{r.comment}</p>
      </div>
    ),
  },
  {
    key: "rating",
    header: "Rating",
    sortable: true,
    accessor: (r) => r.rating,
    render: (r) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={i <= r.rating ? "fill-gold text-gold" : "text-ink/20"}
          />
        ))}
      </div>
    ),
  },
  {
    key: "fit",
    header: "Fit",
    sortable: true,
    accessor: (r) => r.fit ?? "",
    render: (r) =>
      r.fit ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
          Runs {r.fit}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "reviewer",
    header: "Reviewer",
    accessor: (r) => r.user_name,
    render: (r) => (
      <div className="text-sm text-ink/80 leading-tight">
        <p>{r.user_name}</p>
        {r.is_verified && (
          <p className="text-[10px] tracking-[0.2em] uppercase text-emerald-700">
            Verified
          </p>
        )}
      </div>
    ),
  },
  {
    key: "published",
    header: "Status",
    sortable: true,
    accessor: (r) => (r.is_published ? "published" : "hidden"),
    render: (r) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          r.is_published ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {r.is_published ? "Published" : "Hidden"}
      </span>
    ),
  },
  {
    key: "helpful",
    header: "Helpful",
    sortable: true,
    align: "right",
    accessor: (r) => r.helpful_count,
    render: (r) => (
      <span className="tabular text-sm text-ink/65">{r.helpful_count}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Date",
    sortable: true,
    accessor: (r) => r.created_at,
    render: (r) => (
      <span className="text-sm text-ink/65">{formatDate(r.created_at)}</span>
    ),
  },
];

export default function AdminReviews() {
  return (
    <ResourceManager<Review>
      eyebrow="Content"
      title="Reviews"
      singular="review"
      description="Moderate customer reviews — toggle visibility, remove abuse."
      client={djangoAdmin.reviews as CrudClient<Review>}
      rowKey={(r) => r.id}
      rowLabel={(r) => `"${r.title}" by ${r.user_name}`}
      columns={columns}
      searchPlaceholder="Search reviews…"
      searchAccessor={(r) => `${r.title} ${r.comment} ${r.user_name}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "published", label: "Published", predicate: (r) => r.is_published },
        { key: "hidden", label: "Hidden", predicate: (r) => !r.is_published },
        { key: "low", label: "1–2★", predicate: (r) => r.rating <= 2 },
      ]}
    />
  );
}
