import type { Guide } from "./types";

const guide: Guide = {
  slug: "industrial-needle-systems-and-sizes",
  published: "2026-11-04",
  updated: "2026-11-04",
  tag: "NEEDLES",
  en: {
    title: "Needle systems & sizes for industrial machines (DBx1, DPx5, DCx27…)",
    description:
      "How needle systems, sizes and points work, the systems common in garment factories, the Nm / Singer size table — and why the machine manual has the final word.",
    blocks: [
      {
        t: "p",
        text: "An industrial sewing needle is ordered by three things: its **system** (which machines it fits), its **size** (how thick it is) and its **point** (how it meets the fabric). Get the system wrong and the needle may not fit, or sits at the wrong height — skipped stitches, broken thread or a damaged hook follow.",
      },
      { t: "h2", id: "system", text: "1. The system" },
      {
        t: "p",
        text: "The system code describes the needle's shank, length and shape. Needle makers use different names for the same system, so one needle can carry several codes. These systems are common in garment factories:",
      },
      {
        t: "table",
        head: ["System", "Also sold as", "Typically used on"],
        rows: [
          ["`DBx1`", "`16x231`, `1738`", "Single-needle lockstitch machines"],
          ["`DPx5`", "`135x5`, `134`", "Many two-needle lockstitch, bartack and buttonhole machines"],
          ["`DPx17`", "`135x17`", "Heavy-material and walking-foot lockstitch machines"],
          ["`DCx27`", "`B27`, `81x1`", "Overlock (serger) machines"],
          ["`UYx128GAS`", "`UY128GAS`", "Coverstitch / flatlock (interlock) machines"],
          ["`DBxK5`", "`DBK5`", "Multi-head embroidery machines"],
        ],
        caption: "Typical uses only. Machines in the same family can use different systems by sub-class — confirm with the machine manual or the packet of the needle already in the machine.",
      },
      { t: "h2", id: "size", text: "2. The size" },
      {
        t: "p",
        text: "Size is the blade diameter. The metric number (Nm) is the diameter in hundredths of a millimetre — Nm 90 is 0.90 mm. Most packets also show the older Singer number.",
      },
      {
        t: "table",
        head: ["Metric (Nm)", "Singer", "Rough guide"],
        rows: [
          ["`65`", "`9`", "Very fine fabrics"],
          ["`70`", "`10`", "Fine woven, light knits"],
          ["`75`", "`11`", "Shirting, T-shirt knits"],
          ["`80`", "`12`", "Light to medium fabrics"],
          ["`90`", "`14`", "Medium-weight fabrics — a common default"],
          ["`100`", "`16`", "Denim, twill, canvas"],
          ["`110`", "`18`", "Heavy denim, workwear"],
          ["`120`", "`19`", "Heavy materials"],
          ["`130`", "`21`", "Very heavy materials"],
          ["`140`", "`22`", "Very heavy materials"],
        ],
        caption: "The fabric column is a rough starting point, not a rule — thread size, stitch type and machine settings matter as much.",
      },
      {
        t: "p",
        text: "Needle and thread go together: thicker thread needs a larger eye and groove. If thread frays or breaks at the needle, the needle may be too small for the thread.",
      },
      { t: "h2", id: "point", text: "3. The point" },
      {
        t: "table",
        head: ["Code", "Point", "Use"],
        rows: [
          ["`R`", "Normal round (set) point", "Woven fabrics"],
          ["`SES`", "Light ball point", "Knits and fine knits — pushes yarns aside instead of piercing them"],
          ["`SUK`", "Medium ball point", "Coarser knits, elastic and elastane fabrics"],
          ["`LR`, `S`, `D` …", "Cutting points", "Leather only — not for textiles"],
        ],
        caption: "Point codes as used by Groz-Beckert and other makers; names can differ by brand.",
      },
      { t: "h2", id: "order", text: "How to order the right needle" },
      {
        t: "ol",
        items: [
          "Read the system and size from the packet of the needles you use now, or from the machine manual.",
          "Tell us the machine model and the fabric.",
          "Give system + size + point, for example `DBx1 Nm 90 SES` or `DCx27 #11`. In our catalogue a needle's part number usually contains its system and size (for example `DBX1-14-…`).",
          "Mention any coating you use now (for example titanium-coated), so we quote the same kind.",
        ],
      },
      { t: "note", text: "Not sure? Send a photo of the needle packet and the machine's model plate on WhatsApp, or [search needles by system](/search?q=DBX1)." },
    ],
  },
  bn: {
    title: "ইন্ডাস্ট্রিয়াল মেশিনের নিডল সিস্টেম ও সাইজ (DBx1, DPx5, DCx27…)",
    description:
      "নিডলের সিস্টেম, সাইজ ও পয়েন্ট কীভাবে কাজ করে, গার্মেন্টস কারখানায় প্রচলিত সিস্টেম, Nm / Singer সাইজ টেবিল — এবং কেন শেষ কথা মেশিনের ম্যানুয়াল।",
    blocks: [
      {
        t: "p",
        text: "ইন্ডাস্ট্রিয়াল সেলাইয়ের নিডল অর্ডার হয় তিনটি তথ্যে: **সিস্টেম** (কোন মেশিনে লাগে), **সাইজ** (কতটা মোটা) এবং **পয়েন্ট** (কাপড়ে কীভাবে ঢোকে)। সিস্টেম ভুল হলে নিডল লাগবে না, অথবা ভুল উচ্চতায় বসবে — তখন স্টিচ বাদ পড়া, সুতা ছেঁড়া বা হুক নষ্ট হওয়া শুরু হয়।",
      },
      { t: "h2", id: "system", text: "১. সিস্টেম" },
      {
        t: "p",
        text: "সিস্টেম কোড নিডলের শ্যাংক, দৈর্ঘ্য ও আকার বোঝায়। একই সিস্টেমকে বিভিন্ন নির্মাতা ভিন্ন নামে ডাকে, তাই একটি নিডলের কয়েকটি কোড থাকতে পারে। গার্মেন্টস কারখানায় প্রচলিত সিস্টেমগুলো:",
      },
      {
        t: "table",
        head: ["সিস্টেম", "অন্য নামে", "সাধারণত যে মেশিনে"],
        rows: [
          ["`DBx1`", "`16x231`, `1738`", "সিঙ্গেল-নিডল লকস্টিচ মেশিন"],
          ["`DPx5`", "`135x5`, `134`", "অনেক টু-নিডল লকস্টিচ, বারট্যাক ও বাটনহোল মেশিন"],
          ["`DPx17`", "`135x17`", "ভারী কাপড় ও ওয়াকিং-ফুট লকস্টিচ মেশিন"],
          ["`DCx27`", "`B27`, `81x1`", "ওভারলক মেশিন"],
          ["`UYx128GAS`", "`UY128GAS`", "কভারস্টিচ / ফ্ল্যাটলক (ইন্টারলক) মেশিন"],
          ["`DBxK5`", "`DBK5`", "মাল্টি-হেড এমব্রয়ডারি মেশিন"],
        ],
        caption: "শুধু সাধারণ ব্যবহার। একই পরিবারের মেশিন সাব-ক্লাসভেদে ভিন্ন সিস্টেম ব্যবহার করতে পারে — মেশিনের ম্যানুয়াল বা মেশিনে লাগানো নিডলের প্যাকেট দেখে নিশ্চিত হোন।",
      },
      { t: "h2", id: "size", text: "২. সাইজ" },
      {
        t: "p",
        text: "সাইজ মানে নিডলের ব্লেডের ব্যাস। মেট্রিক নম্বর (Nm) হলো মিলিমিটারের শতভাগে ব্যাস — Nm 90 মানে 0.90 মিমি। বেশিরভাগ প্যাকেটে পুরোনো Singer নম্বরও লেখা থাকে।",
      },
      {
        t: "table",
        head: ["মেট্রিক (Nm)", "Singer", "মোটামুটি নির্দেশনা"],
        rows: [
          ["`65`", "`9`", "খুব পাতলা কাপড়"],
          ["`70`", "`10`", "পাতলা ওভেন, হালকা নিট"],
          ["`75`", "`11`", "শার্টিং, টি-শার্ট নিট"],
          ["`80`", "`12`", "হালকা থেকে মাঝারি কাপড়"],
          ["`90`", "`14`", "মাঝারি ওজনের কাপড় — প্রচলিত ডিফল্ট"],
          ["`100`", "`16`", "ডেনিম, টুইল, ক্যানভাস"],
          ["`110`", "`18`", "ভারী ডেনিম, ওয়ার্কওয়্যার"],
          ["`120`", "`19`", "ভারী উপকরণ"],
          ["`130`", "`21`", "খুব ভারী উপকরণ"],
          ["`140`", "`22`", "খুব ভারী উপকরণ"],
        ],
        caption: "কাপড়ের কলামটি শুরু করার একটি মোটামুটি ধারণা, নিয়ম নয় — সুতার সাইজ, স্টিচের ধরন ও মেশিনের সেটিংও সমান জরুরি।",
      },
      {
        t: "p",
        text: "নিডল ও সুতা একসঙ্গে মেলাতে হয়: মোটা সুতার জন্য বড় আই ও খাঁজ দরকার। নিডলের কাছে সুতা ফেঁসে গেলে বা ছিঁড়ে গেলে নিডলটি সুতার তুলনায় ছোট হতে পারে।",
      },
      { t: "h2", id: "point", text: "৩. পয়েন্ট" },
      {
        t: "table",
        head: ["কোড", "পয়েন্ট", "ব্যবহার"],
        rows: [
          ["`R`", "সাধারণ গোল (সেট) পয়েন্ট", "ওভেন কাপড়"],
          ["`SES`", "হালকা বল পয়েন্ট", "নিট ও পাতলা নিট — সুতা না কেটে পাশে সরিয়ে ঢোকে"],
          ["`SUK`", "মাঝারি বল পয়েন্ট", "মোটা নিট, ইলাস্টিক ও ইলাস্টেন কাপড়"],
          ["`LR`, `S`, `D` …", "কাটিং পয়েন্ট", "শুধু চামড়া — টেক্সটাইলের জন্য নয়"],
        ],
        caption: "Groz-Beckert ও অন্যান্য নির্মাতার ব্যবহৃত পয়েন্ট কোড; ব্র্যান্ডভেদে নাম আলাদা হতে পারে।",
      },
      { t: "h2", id: "order", text: "সঠিক নিডল কীভাবে অর্ডার করবেন" },
      {
        t: "ol",
        items: [
          "এখন যে নিডল ব্যবহার করছেন তার প্যাকেট বা মেশিনের ম্যানুয়াল থেকে সিস্টেম ও সাইজ দেখুন।",
          "মেশিনের মডেল ও কাপড়ের ধরন জানান।",
          "সিস্টেম + সাইজ + পয়েন্ট লিখুন, যেমন `DBx1 Nm 90 SES` বা `DCx27 #11`। আমাদের ক্যাটালগে নিডলের পার্ট নম্বরে সাধারণত সিস্টেম ও সাইজ থাকে (যেমন `DBX1-14-…`)।",
          "এখন কোনো কোটিং (যেমন টাইটানিয়াম-কোটেড) ব্যবহার করলে তা জানান, যাতে একই ধরনের দাম দিতে পারি।",
        ],
      },
      { t: "note", text: "নিশ্চিত নন? নিডলের প্যাকেট ও মেশিনের মডেল প্লেটের ছবি হোয়াটসঅ্যাপে পাঠান, অথবা [সিস্টেম দিয়ে নিডল খুঁজুন](/search?q=DBX1)।" },
    ],
  },
};

export default guide;
