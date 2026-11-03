import type { FAQ } from "@/types";

export const faqs: FAQ[] = [
  {
    id: "faq_1",
    category: "Orders",
    question: "How long does shipping take?",
    answer:
      "Standard orders within the US ship in 2–4 business days. International orders take 7–10 business days. Express shipping (1–2 days) is available at checkout.",
    order: 1,
  },
  {
    id: "faq_2",
    category: "Orders",
    question: "Do you offer free shipping?",
    answer:
      "Yes — complimentary shipping on all orders above $150 within the US. International free shipping begins at $350.",
    order: 2,
  },
  {
    id: "faq_3",
    category: "Returns",
    question: "What is your return policy?",
    answer:
      "We accept returns within 30 days of delivery. Items must be unworn, with tags attached, and in original packaging. Returns are complimentary for members.",
    order: 3,
  },
  {
    id: "faq_4",
    category: "Returns",
    question: "How do I start a return?",
    answer:
      "Head to your account → Orders → Start Return. We'll email a prepaid label. Refunds are processed within 5 business days of receipt.",
    order: 4,
  },
  {
    id: "faq_5",
    category: "Sizing",
    question: "How do your pieces fit?",
    answer:
      "Each product page includes a full fit guide and measurement chart. Our tailoring runs true to size; knitwear runs slightly relaxed. When in doubt, contact our atelier team.",
    order: 5,
  },
  {
    id: "faq_6",
    category: "Sizing",
    question: "Do you offer alterations?",
    answer:
      "Members of Rakib Obsidian receive complimentary alterations on suiting. Non-members can request alterations for a flat fee at checkout.",
    order: 6,
  },
  {
    id: "faq_7",
    category: "Product Care",
    question: "How should I care for my Rakib Enterprise pieces?",
    answer:
      "Each garment arrives with detailed care instructions. Generally: cold wash for cotton, dry-clean for tailoring and cashmere, and store knits folded rather than hung.",
    order: 7,
  },
  {
    id: "faq_8",
    category: "Membership",
    question: "What is Rakib Obsidian?",
    answer:
      "Obsidian is our invite-only client program — early access to drops, complimentary alterations, private showroom visits, and a dedicated stylist. Spend thresholds apply.",
    order: 8,
  },
  {
    id: "faq_9",
    category: "Payments",
    question: "Which payment methods do you accept?",
    answer:
      "All major credit cards, Apple Pay, Google Pay, and PayPal. Pay-in-4 via Affirm is available on orders above $200.",
    order: 9,
  },
  {
    id: "faq_10",
    category: "Contact",
    question: "How can I reach the atelier?",
    answer:
      "Email hello@rakibenterprise-bd.com, or book a consultation at our New York or Milan showrooms. We reply within one business day.",
    order: 10,
  },
];

export const faqCategories = () =>
  Array.from(new Set(faqs.map((f) => f.category)));
