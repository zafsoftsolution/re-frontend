"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

interface FAQ extends Record<string, unknown> {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful_count: number;
  order: number;
  is_published: boolean;
}

const columns: Column<FAQ>[] = [
  {
    key: "question",
    header: "Question",
    sortable: true,
    accessor: (f) => f.question,
    render: (f) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{f.question}</p>
        <p className="text-[11px] text-ink/55 line-clamp-1 mt-0.5">{f.answer}</p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    sortable: true,
    accessor: (f) => f.category,
    render: (f) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-gold">
        {f.category}
      </span>
    ),
  },
  {
    key: "order",
    header: "Order",
    sortable: true,
    align: "right",
    accessor: (f) => f.order,
    render: (f) => <span className="tabular text-sm text-ink/65">{f.order}</span>,
  },
  {
    key: "helpful",
    header: "Helpful",
    sortable: true,
    align: "right",
    accessor: (f) => f.helpful_count,
    render: (f) => (
      <span className="tabular text-sm text-ink/65">{f.helpful_count}</span>
    ),
  },
  {
    key: "published",
    header: "Status",
    accessor: (f) => (f.is_published ? "yes" : "no"),
    render: (f) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          f.is_published ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {f.is_published ? "Published" : "Draft"}
      </span>
    ),
  },
];

export default function AdminFAQs() {
  return (
    <ResourceManager<FAQ>
      eyebrow="Content"
      title="FAQs"
      singular="FAQ"
      description="Help-centre articles, grouped by category and ordered for the storefront."
      client={djangoAdmin.faqs as CrudClient<FAQ>}
      rowKey={(f) => f.id}
      rowLabel={(f) => f.question}
      columns={columns}
      searchPlaceholder="Search FAQs…"
      searchAccessor={(f) => `${f.question} ${f.answer} ${f.category}`}
      initialValues={{ is_published: true, order: 99 }}
      fields={[
        { name: "category", label: "Category", type: "text", required: true, placeholder: "Shipping, Returns, …" },
        { name: "order", label: "Order", type: "number", hint: "Lower numbers appear first" },
        { name: "question", label: "Question", type: "text", required: true, full: true },
        { name: "answer", label: "Answer", type: "textarea", required: true, full: true, rows: 6 },
        { name: "is_published", label: "Published", type: "boolean" },
      ]}
    />
  );
}
