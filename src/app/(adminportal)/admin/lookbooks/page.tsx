"use client";

import Image from "next/image";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface Lookbook extends Record<string, unknown> {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  season: string;
  cover_image: string;
  images: string[];
  description: string;
  intro: string;
  photographer: string;
  stylist: string;
  location: string;
  date: string;
  is_published: boolean;
}

const columns: Column<Lookbook>[] = [
  {
    key: "title",
    header: "Lookbook",
    sortable: true,
    accessor: (l) => l.title,
    render: (l) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-12 w-9 shrink-0 rounded bg-bone overflow-hidden">
          {l.cover_image && (
            <Image src={l.cover_image} alt="" width={36} height={48} className="h-full w-full object-cover" unoptimized />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-navy truncate">{l.title}</p>
          <p className="text-[11px] text-ink/45 truncate">{l.subtitle || `/${l.slug}`}</p>
        </div>
      </div>
    ),
  },
  {
    key: "season",
    header: "Season",
    sortable: true,
    accessor: (l) => l.season,
    render: (l) => (
      <span className="text-[11px] tracking-[0.2em] uppercase text-gold">
        {l.season || "—"}
      </span>
    ),
  },
  {
    key: "credits",
    header: "Credits",
    accessor: (l) => `${l.photographer} ${l.stylist}`,
    render: (l) => (
      <div className="text-xs text-ink/65 leading-tight">
        {l.photographer && <p>📷 {l.photographer}</p>}
        {l.stylist && <p>👗 {l.stylist}</p>}
      </div>
    ),
  },
  {
    key: "date",
    header: "Date",
    sortable: true,
    accessor: (l) => l.date,
    render: (l) => <span className="text-sm text-ink/65">{l.date ? formatDate(l.date) : "—"}</span>,
  },
  {
    key: "published",
    header: "Status",
    accessor: (l) => (l.is_published ? "yes" : "no"),
    render: (l) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${l.is_published ? "text-emerald-700" : "text-ink/45"}`}>
        {l.is_published ? "Published" : "Draft"}
      </span>
    ),
  },
];

export default function AdminLookbooks() {
  return (
    <ResourceManager<Lookbook>
      eyebrow="Catalog"
      title="Lookbooks"
      description="Editorial spreads and shoots tied to collections or themes."
      client={djangoAdmin.lookbooks as CrudClient<Lookbook>}
      rowKey={(l) => l.slug}
      rowLabel={(l) => l.title}
      columns={columns}
      searchPlaceholder="Search by title, photographer, location…"
      searchAccessor={(l) => `${l.title} ${l.subtitle} ${l.photographer} ${l.stylist} ${l.location}`}
      initialValues={{ is_published: true }}
      fields={[
        { name: "title", label: "Title", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          hint: "URL fragment — auto-generated from the title.",
          autoFrom: "title",
        },
        { name: "subtitle", label: "Subtitle", type: "text", full: true },
        { name: "season", label: "Season", type: "text", placeholder: "SS26" },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "cover_image", label: "Cover image", type: "imageUrl", required: true, full: true },
        { name: "images", label: "Spread images", type: "imageList", full: true,
          hint: "Drop or upload one or more images for the editorial spread." },
        { name: "photographer", label: "Photographer", type: "text" },
        { name: "stylist", label: "Stylist", type: "text" },
        { name: "location", label: "Location", type: "text", full: true },
        { name: "intro", label: "Intro", type: "textarea", full: true, rows: 3 },
        { name: "description", label: "Description", type: "textarea", full: true, rows: 4 },
        { name: "is_published", label: "Published", type: "boolean" },
      ]}
    />
  );
}
