import type { Guide } from "./types";

const guide: Guide = {
  slug: "how-to-read-a-sewing-machine-part-number",
  published: "2026-11-04",
  updated: "2026-11-04",
  tag: "PART NO.",
  en: {
    title: "How to read a sewing machine part number",
    description:
      "Where to find the number — parts book, old part, packet — and the details (suffix, machine sub-class) that decide whether a spare part fits.",
    blocks: [
      {
        t: "p",
        text: "A part number is the only description of a spare part that means the same thing to you, to us and to the machine maker. “Bobbin case for Juki” can mean a dozen different parts; a full part number means exactly one. This guide explains where to find the number and how to read it, so the first part we send is the right one.",
      },
      { t: "h2", id: "where", text: "Where to find the number" },
      {
        t: "ul",
        items: [
          "**The parts book (parts list) for your machine model.** Every part is drawn in an exploded view with a reference number, and the table beside the drawing gives the full part number. If you don't have the book, we can usually help from the exact model name.",
          "**The packet or label** from the last purchase. Genuine parts are normally packed with the maker's part number printed on the label.",
          "**The old part itself.** Some parts carry a number stamped or printed on them, but many small parts do not, and markings wear off. A number cast into a part can also be a mould number rather than the number you order by.",
          "**Your maintenance records or old invoices.**",
        ],
      },
      { t: "h2", id: "structure", text: "Reading the structure" },
      {
        t: "p",
        text: "Most makers write part numbers in blocks separated by hyphens, for example `B1109-552-H00` or `148295-001`. Each block means something in the maker's own system, but those systems are rarely published and they differ between brands. So treat the whole number as one code: copy all of it, including letters, and don't shorten it.",
      },
      {
        t: "table",
        head: ["Format", "What to watch"],
        rows: [
          ["Letter + digit blocks, e.g. `B1109-552-H00`", "Letters and zeros are easy to confuse (`0` / `O`, `1` / `I`). The last block is part of the number."],
          ["Digits + short suffix, e.g. `148295-001`", "The suffix is part of the number — `-001` and `-002` can be different parts."],
          ["Number + size or gauge, e.g. a needle `DBX1-14`", "The size is part of what you order; say it every time."],
        ],
        caption: "Format examples only — every brand has its own scheme, and it can change between machine generations.",
      },
      { t: "h2", id: "suffix", text: "The suffix matters" },
      {
        t: "p",
        text: "The last characters often separate variants: a different gauge, a different needle hole, a version for a heavy-material sub-class, or a revised design. Two numbers that differ only at the end may or may not be interchangeable — never assume they are. When a maker replaces (supersedes) an old number with a new one, the parts list or we can confirm the replacement.",
      },
      { t: "h2", id: "machine", text: "Give us the machine, not just the brand" },
      {
        t: "p",
        text: "The same base machine is sold in sub-classes for different fabrics and functions, and some parts exist only for one sub-class. The model plate on the machine shows the full model and sub-class — a photo of it removes most of the guesswork.",
      },
      { t: "h2", id: "no-number", text: "When there is no number" },
      {
        t: "ol",
        items: [
          "Take two or three sharp photos of the part in daylight — front, back and side — with a ruler or coin beside it for scale.",
          "Add a photo of the machine's model plate.",
          "Note what the part does, where it sits, and any measurements you can take (length, hole sizes, gauge).",
          "Send it on WhatsApp, or attach the photos to a [quote request](/rfq). We match it against the parts lists.",
        ],
      },
      { t: "h2", id: "search", text: "Typing a number into our search" },
      {
        t: "p",
        text: "Our [search](/search) ignores spaces, hyphens, dots and capitals, and accepts Bangla digits, so `b1109 552 h00` finds `B1109-552-H00`. An exact match is pinned at the top of the results. If nothing comes up, request a quote with the number anyway — we can often source parts that are not listed yet.",
      },
    ],
  },
  bn: {
    title: "সেলাই মেশিনের পার্ট নম্বর কীভাবে পড়বেন",
    description:
      "পার্ট নম্বর কোথায় পাবেন — পার্টস বুক, পুরোনো পার্টস, প্যাকেট — এবং কোন খুঁটিনাটি (সাফিক্স, মেশিনের সাব-ক্লাস) ঠিক করে দেয় পার্টসটি মিলবে কি না।",
    blocks: [
      {
        t: "p",
        text: "স্পেয়ার পার্টসের একমাত্র বর্ণনা যা আপনার, আমাদের এবং মেশিন নির্মাতার কাছে একই অর্থ বহন করে, তা হলো পার্ট নম্বর। “জুকির ববিন কেস” বললে এক ডজন আলাদা পার্টস বোঝাতে পারে; পূর্ণ পার্ট নম্বর বোঝায় ঠিক একটি। এই গাইডে দেখানো হয়েছে নম্বরটি কোথায় পাবেন এবং কীভাবে পড়বেন, যাতে প্রথমবারেই সঠিক পার্টস পাঠানো যায়।",
      },
      { t: "h2", id: "where", text: "নম্বর কোথায় পাবেন" },
      {
        t: "ul",
        items: [
          "**আপনার মেশিন মডেলের পার্টস বুক (পার্টস লিস্ট)।** প্রতিটি পার্টস খোলা-নকশায় (এক্সপ্লোডেড ভিউ) একটি রেফারেন্স নম্বরসহ আঁকা থাকে, আর পাশের টেবিলে থাকে পূর্ণ পার্ট নম্বর। বই না থাকলে সঠিক মডেলের নাম জানালে সাধারণত আমরা সাহায্য করতে পারি।",
          "**আগের কেনা পার্টসের প্যাকেট বা লেবেল।** জেনুইন পার্টস সাধারণত নির্মাতার পার্ট নম্বর ছাপা লেবেলসহ প্যাকেটে আসে।",
          "**পুরোনো পার্টসটি নিজেই।** কিছু পার্টসের গায়ে নম্বর খোদাই বা ছাপা থাকে, তবে অনেক ছোট পার্টসে থাকে না, আর দাগ মুছেও যায়। ঢালাইয়ের গায়ের নম্বর অনেক সময় ছাঁচের নম্বর — অর্ডারের নম্বর নয়।",
          "**আপনার মেইনটেন্যান্স রেকর্ড বা পুরোনো ইনভয়েস।**",
        ],
      },
      { t: "h2", id: "structure", text: "নম্বরের গঠন বোঝা" },
      {
        t: "p",
        text: "বেশিরভাগ নির্মাতা হাইফেন দিয়ে ভাগ করা কয়েকটি অংশে পার্ট নম্বর লেখে, যেমন `B1109-552-H00` বা `148295-001`। প্রতিটি অংশের অর্থ নির্মাতার নিজস্ব পদ্ধতিতে নির্ধারিত, যা খুব কমই প্রকাশ করা হয় এবং ব্র্যান্ডভেদে আলাদা। তাই পুরো নম্বরটিকে একটি কোড হিসেবে ধরুন: অক্ষরসহ পুরোটা লিখুন, ছোট করবেন না।",
      },
      {
        t: "table",
        head: ["ধরন", "যা খেয়াল রাখবেন"],
        rows: [
          ["অক্ষর + সংখ্যার অংশ, যেমন `B1109-552-H00`", "অক্ষর ও শূন্য সহজে গুলিয়ে যায় (`0` / `O`, `1` / `I`)। শেষ অংশটিও নম্বরের অংশ।"],
          ["সংখ্যা + ছোট সাফিক্স, যেমন `148295-001`", "সাফিক্স নম্বরেরই অংশ — `-001` আর `-002` আলাদা পার্টস হতে পারে।"],
          ["নম্বর + সাইজ বা গেজ, যেমন নিডল `DBX1-14`", "সাইজও অর্ডারের অংশ; প্রতিবার উল্লেখ করুন।"],
        ],
        caption: "শুধু ধরনের উদাহরণ — প্রতিটি ব্র্যান্ডের নিজস্ব পদ্ধতি আছে, আর মেশিনের প্রজন্মভেদে তা বদলাতে পারে।",
      },
      { t: "h2", id: "suffix", text: "শেষের অংশ (সাফিক্স) গুরুত্বপূর্ণ" },
      {
        t: "p",
        text: "শেষের অক্ষরগুলো প্রায়ই ভ্যারিয়েন্ট আলাদা করে: ভিন্ন গেজ, ভিন্ন নিডল হোল, ভারী কাপড়ের সাব-ক্লাসের সংস্করণ, বা পরিবর্তিত নকশা। শুধু শেষে আলাদা এমন দুটি নম্বর একে অপরের বদলে চলতেও পারে, না-ও পারে — কখনো ধরে নেবেন না। নির্মাতা পুরোনো নম্বরের বদলে নতুন নম্বর দিলে পার্টস লিস্ট দেখে বা আমাদের জিজ্ঞেস করে নিশ্চিত হোন।",
      },
      { t: "h2", id: "machine", text: "শুধু ব্র্যান্ড নয়, মেশিনের মডেল জানান" },
      {
        t: "p",
        text: "একই মূল মেশিন ভিন্ন কাপড় ও কাজের জন্য বিভিন্ন সাব-ক্লাসে বিক্রি হয়, আর কিছু পার্টস শুধু একটি সাব-ক্লাসের জন্য। মেশিনের মডেল প্লেটে পূর্ণ মডেল ও সাব-ক্লাস লেখা থাকে — তার একটি ছবি বেশিরভাগ অনুমান দূর করে।",
      },
      { t: "h2", id: "no-number", text: "নম্বর না থাকলে" },
      {
        t: "ol",
        items: [
          "দিনের আলোয় পার্টসের দুই-তিনটি পরিষ্কার ছবি তুলুন — সামনে, পেছনে ও পাশ থেকে — মাপ বোঝাতে পাশে একটি স্কেল বা কয়েন রাখুন।",
          "মেশিনের মডেল প্লেটের একটি ছবি যোগ করুন।",
          "পার্টসটি কী কাজ করে, কোথায় বসে এবং যে মাপগুলো নিতে পারেন (দৈর্ঘ্য, ছিদ্রের মাপ, গেজ) তা লিখুন।",
          "হোয়াটসঅ্যাপে পাঠান, অথবা [কোটেশন অনুরোধে](/rfq) ছবি সংযুক্ত করুন। আমরা পার্টস লিস্টের সঙ্গে মিলিয়ে দেখব।",
        ],
      },
      { t: "h2", id: "search", text: "আমাদের সার্চে নম্বর লেখা" },
      {
        t: "p",
        text: "আমাদের [সার্চ](/search) স্পেস, হাইফেন, ডট ও বড়-ছোট হাতের অক্ষরের পার্থক্য উপেক্ষা করে এবং বাংলা সংখ্যাও বোঝে, তাই `b1109 552 h00` লিখলেও `B1109-552-H00` পাওয়া যায়। হুবহু মিল ফলাফলের শীর্ষে দেখানো হয়। কিছু না পেলেও নম্বরসহ কোটেশন অনুরোধ পাঠান — তালিকায় নেই এমন পার্টসও আমরা প্রায়ই সংগ্রহ করে দিতে পারি।",
      },
    ],
  },
};

export default guide;
