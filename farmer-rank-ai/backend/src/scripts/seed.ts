import { v4 as uuidv4 } from "uuid";
import { initSchema, insertFarmer } from "../db/postgres";
import { ensureCollections, farmerToEmbeddingText, upsertFarmerVector } from "../db/qdrant";
import { embedText } from "../llm/embeddings";
import { FarmerProfile } from "../types";

const SAMPLE_FARMERS: Array<Omit<FarmerProfile, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Ramesh Gowda",
    cropName: "tomato",
    location: "Bengaluru Rural, Karnataka",
    latitude: 13.05,
    longitude: 77.45,
    quantityKg: 800,
    pricePerKg: 18,
    qualityGrade: "A",
    harvestDate: "2026-07-01",
    certifications: ["FSSAI", "GAP"],
    deliveryReliabilityScore: 0.95,
    buyerFeedbackScore: 0.92,
    totalDeliveries: 40,
    onTimeDeliveries: 38,
  },
  {
    name: "Lakshmi Devi",
    cropName: "tomato",
    location: "Kolar, Karnataka",
    latitude: 13.13,
    longitude: 78.13,
    quantityKg: 1200,
    pricePerKg: 15,
    qualityGrade: "A",
    harvestDate: "2026-06-28",
    certifications: ["Organic India"],
    deliveryReliabilityScore: 0.88,
    buyerFeedbackScore: 0.85,
    totalDeliveries: 25,
    onTimeDeliveries: 22,
  },
  {
    name: "Suresh Patil",
    cropName: "tomato",
    location: "Chikkaballapur, Karnataka",
    latitude: 13.43,
    longitude: 77.73,
    quantityKg: 500,
    pricePerKg: 22,
    qualityGrade: "B",
    harvestDate: "2026-07-03",
    certifications: [],
    deliveryReliabilityScore: 0.7,
    buyerFeedbackScore: 0.65,
    totalDeliveries: 12,
    onTimeDeliveries: 8,
  },
  {
    name: "Meena Kumari",
    cropName: "onion",
    location: "Bengaluru Rural, Karnataka",
    latitude: 13.02,
    longitude: 77.5,
    quantityKg: 2000,
    pricePerKg: 12,
    qualityGrade: "A",
    harvestDate: "2026-06-20",
    certifications: ["FSSAI"],
    deliveryReliabilityScore: 0.9,
    buyerFeedbackScore: 0.88,
    totalDeliveries: 30,
    onTimeDeliveries: 27,
  },
  {
    name: "Anil Kumar",
    cropName: "tomato",
    location: "Hosur, Tamil Nadu",
    latitude: 12.74,
    longitude: 77.83,
    quantityKg: 950,
    pricePerKg: 17,
    qualityGrade: "A",
    harvestDate: "2026-07-02",
    certifications: ["GAP", "FSSAI"],
    deliveryReliabilityScore: 0.98,
    buyerFeedbackScore: 0.94,
    totalDeliveries: 55,
    onTimeDeliveries: 54,
  },
  {
    name: "Farmer Cooperative Mysuru",
    cropName: "mango",
    location: "Mysuru, Karnataka",
    latitude: 12.3,
    longitude: 76.65,
    quantityKg: 3000,
    pricePerKg: 45,
    qualityGrade: "A",
    harvestDate: "2026-05-15",
    certifications: ["Organic India", "GI Tag"],
    deliveryReliabilityScore: 0.93,
    buyerFeedbackScore: 0.9,
    totalDeliveries: 20,
    onTimeDeliveries: 19,
  },
];

async function main() {
  console.log("Ensuring schema + collections exist...");
  await initSchema();
  await ensureCollections();

  console.log(`Seeding ${SAMPLE_FARMERS.length} sample farmers...`);
  for (const sample of SAMPLE_FARMERS) {
    const now = new Date().toISOString();
    const farmer: FarmerProfile = { ...sample, id: uuidv4(), createdAt: now, updatedAt: now };
    await insertFarmer(farmer);
    const vector = await embedText(farmerToEmbeddingText(farmer));
    await upsertFarmerVector(farmer, vector);
    console.log(`  + ${farmer.name} (${farmer.cropName}, grade ${farmer.qualityGrade}) -> ${farmer.id}`);
  }

  console.log("Done. Try: POST /query { \"query\": \"I need 500kg Grade A tomatoes near Bengaluru under ₹20/kg\" }");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
