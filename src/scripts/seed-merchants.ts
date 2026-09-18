/**
 * Seeds sample "active" merchants so the Find Merchants page has real data
 * to build against. Upserts by name, so it's safe to re-run.
 *
 * Usage: npm run seed:merchants
 */
import { connectDB } from "../config/db.js";
import { Merchant } from "../models/Merchant.js";
import mongoose from "mongoose";

type Market = "GH" | "UK";

interface SeedMerchant {
  name: string;
  category: string;
  description: string;
  country: Market;
  contactEmail: string;
  contactPhone: string;
  discountPercent: number;
  city: string;
  address: string;
}

const MARKET_NAMES: Record<Market, string> = { GH: "Ghana", UK: "United Kingdom" };

function mapsUrlFor(name: string, city: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`;
}

function emailFor(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return `hello@${slug}.example.com`;
}

const merchants: SeedMerchant[] = [
  // Ghana
  {
    name: "Osu Garden Restaurant",
    category: "Restaurant",
    description: "Modern Ghanaian fusion dining in the heart of Osu.",
    country: "GH",
    contactEmail: emailFor("Osu Garden Restaurant"),
    contactPhone: "+233244123456",
    discountPercent: 15,
    city: "Accra",
    address: "12 Oxford Street, Osu",
  },
  {
    name: "MaxMart Supermarket",
    category: "Grocery & Supermarket",
    description: "Fresh produce and everyday essentials, all under one roof.",
    country: "GH",
    contactEmail: emailFor("MaxMart Supermarket"),
    contactPhone: "+233201234567",
    discountPercent: 10,
    city: "Accra",
    address: "Spintex Road",
  },
  {
    name: "Kumasi Fashion House",
    category: "Fashion & Apparel",
    description: "Custom tailoring and ready-to-wear African prints.",
    country: "GH",
    contactEmail: emailFor("Kumasi Fashion House"),
    contactPhone: "+233551122334",
    discountPercent: 20,
    city: "Kumasi",
    address: "Adum Market Road",
  },
  {
    name: "Radiance Spa & Wellness",
    category: "Beauty & Spa",
    description: "Full-service spa treatments and massage therapy.",
    country: "GH",
    contactEmail: emailFor("Radiance Spa Wellness"),
    contactPhone: "+233245566778",
    discountPercent: 15,
    city: "Accra",
    address: "Cantonments Road",
  },
  {
    name: "Iron Body Fitness",
    category: "Fitness & Gym",
    description: "24-hour gym with personal training packages.",
    country: "GH",
    contactEmail: emailFor("Iron Body Fitness"),
    contactPhone: "+233209988776",
    discountPercent: 10,
    city: "Tema",
    address: "Community 4, Main Street",
  },
  {
    name: "Golden Gate Cinema",
    category: "Entertainment & Leisure",
    description: "First-run movies and a rooftop lounge.",
    country: "GH",
    contactEmail: emailFor("Golden Gate Cinema"),
    contactPhone: "+233247712345",
    discountPercent: 5,
    city: "Accra",
    address: "Accra Mall, Tetteh Quarshie",
  },
  {
    name: "Savannah Travels",
    category: "Travel & Hospitality",
    description: "Domestic and international travel booking.",
    country: "GH",
    contactEmail: emailFor("Savannah Travels"),
    contactPhone: "+233248834567",
    discountPercent: 10,
    city: "Accra",
    address: "Ring Road Central",
  },
  {
    name: "TechHub Electronics",
    category: "Electronics & Tech",
    description: "Phones, laptops, and accessories with warranty.",
    country: "GH",
    contactEmail: emailFor("TechHub Electronics"),
    contactPhone: "+233203345566",
    discountPercent: 15,
    city: "Kumasi",
    address: "Kejetia Market",
  },
  {
    name: "VitalCare Pharmacy & Wellness",
    category: "Health & Wellness",
    description: "Pharmacy, vitamins, and wellness consultations.",
    country: "GH",
    contactEmail: emailFor("VitalCare Pharmacy Wellness"),
    contactPhone: "+233245123789",
    discountPercent: 10,
    city: "Accra",
    address: "Dzorwulu Roundabout",
  },
  {
    name: "AutoFix Ghana",
    category: "Automotive",
    description: "Auto repair, servicing, and tyre replacement.",
    country: "GH",
    contactEmail: emailFor("AutoFix Ghana"),
    contactPhone: "+233207765432",
    discountPercent: 15,
    city: "Tema",
    address: "Heavy Industrial Area",
  },

  // United Kingdom
  {
    name: "The Thames Bistro",
    category: "Restaurant",
    description: "Riverside dining with a seasonal British menu.",
    country: "UK",
    contactEmail: emailFor("The Thames Bistro"),
    contactPhone: "+447911123456",
    discountPercent: 15,
    city: "London",
    address: "24 South Bank",
  },
  {
    name: "Fresh & Co Grocers",
    category: "Grocery & Supermarket",
    description: "Organic and locally-sourced groceries.",
    country: "UK",
    contactEmail: emailFor("Fresh Co Grocers"),
    contactPhone: "+447700900123",
    discountPercent: 10,
    city: "Manchester",
    address: "Deansgate",
  },
  {
    name: "Savile Row Tailors",
    category: "Fashion & Apparel",
    description: "Bespoke suits and made-to-measure tailoring.",
    country: "UK",
    contactEmail: emailFor("Savile Row Tailors"),
    contactPhone: "+447911223344",
    discountPercent: 20,
    city: "London",
    address: "14 Savile Row",
  },
  {
    name: "Urban Glow Beauty Bar",
    category: "Beauty & Spa",
    description: "Skincare facials and nail treatments.",
    country: "UK",
    contactEmail: emailFor("Urban Glow Beauty Bar"),
    contactPhone: "+447700556677",
    discountPercent: 15,
    city: "Birmingham",
    address: "Bullring Estate",
  },
  {
    name: "PowerHouse Gym",
    category: "Fitness & Gym",
    description: "Strength training and group fitness classes.",
    country: "UK",
    contactEmail: emailFor("PowerHouse Gym"),
    contactPhone: "+447911998877",
    discountPercent: 10,
    city: "London",
    address: "Old Street",
  },
  {
    name: "West End Cinema Club",
    category: "Entertainment & Leisure",
    description: "Independent films and classic screenings.",
    country: "UK",
    contactEmail: emailFor("West End Cinema Club"),
    contactPhone: "+447700112233",
    discountPercent: 5,
    city: "London",
    address: "Leicester Square",
  },
  {
    name: "Britannia Travel Co",
    category: "Travel & Hospitality",
    description: "Package holidays and flight bookings.",
    country: "UK",
    contactEmail: emailFor("Britannia Travel Co"),
    contactPhone: "+447911334455",
    discountPercent: 10,
    city: "Manchester",
    address: "Market Street",
  },
  {
    name: "CircuitWorks Electronics",
    category: "Electronics & Tech",
    description: "Consumer electronics and repair services.",
    country: "UK",
    contactEmail: emailFor("CircuitWorks Electronics"),
    contactPhone: "+447700667788",
    discountPercent: 15,
    city: "Birmingham",
    address: "High Street",
  },
  {
    name: "BrightStart Learning Centre",
    category: "Education",
    description: "Tutoring and exam preparation for all ages.",
    country: "UK",
    contactEmail: emailFor("BrightStart Learning Centre"),
    contactPhone: "+447911445566",
    discountPercent: 10,
    city: "Manchester",
    address: "Oxford Road",
  },
  {
    name: "Comfort Home Furnishings",
    category: "Home & Furniture",
    description: "Furniture, décor, and interior styling.",
    country: "UK",
    contactEmail: emailFor("Comfort Home Furnishings"),
    contactPhone: "+447700998811",
    discountPercent: 15,
    city: "London",
    address: "Tottenham Court Road",
  },
];

async function seed() {
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const m of merchants) {
    const existed = await Merchant.exists({ name: m.name });
    await Merchant.findOneAndUpdate(
      { name: m.name },
      {
        name: m.name,
        category: m.category,
        description: m.description,
        country: m.country,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        discountPercent: m.discountPercent,
        status: "active",
        locations: [
          {
            label: m.name,
            address: m.address,
            city: m.city,
            country: MARKET_NAMES[m.country],
            mapsUrl: mapsUrlFor(m.name, m.city),
            coordinates: { type: "Point", coordinates: [0, 0] },
          },
        ],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (existed) updated += 1;
    else created += 1;
  }

  console.log(`[seed:merchants] done — ${created} created, ${updated} updated (${merchants.length} total).`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed:merchants] failed:", err);
  process.exit(1);
});
