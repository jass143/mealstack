import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type ParsedMenuItem = {
  name: string;
  priceCents: number;
  category: string;
  description: string;
  isVeg: boolean;
  isMeal: boolean;
};

/**
 * Send a menu image to Gemini Vision and get back structured menu items.
 */
export async function parseMenuImage(
  imageBase64: string,
  mimeType: string,
  currency: string
): Promise<ParsedMenuItem[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a menu parser. Extract ALL food/drink items from this restaurant menu image.

Return a JSON array only — no markdown, no explanation, no code fences. Each item:
[
  {
    "name": "Item Name",
    "priceCents": 1299,
    "category": "Category Name",
    "description": "brief description if visible, otherwise empty string",
    "isVeg": false,
    "isMeal": false
  }
]

Rules:
- "priceCents" = price in smallest currency unit (e.g. $12.99 = 1299, ₹150 = 15000). The currency is ${currency}.
- "category" = best-fit category from the menu (e.g. "Starters", "Main Course", "Beverages", "Desserts"). Use the category names shown on the menu if visible.
- "isVeg" = true if the item is marked as vegetarian (green dot, "V", "veg", leaf icon, etc.)
- "isMeal" = true if the item is a combo, thali, meal deal, or set menu
- If a price is not visible for an item, set priceCents to 0
- Extract every item you can see, even if partially visible
- Do NOT include section headers, notes, or disclaimers as items`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps it despite instructions
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const items: ParsedMenuItem[] = JSON.parse(cleaned);

  // Validate and sanitize
  return items.map((item) => ({
    name: String(item.name || "").trim(),
    priceCents: Math.max(0, Math.round(Number(item.priceCents) || 0)),
    category: String(item.category || "Uncategorized").trim(),
    description: String(item.description || "").trim(),
    isVeg: Boolean(item.isVeg),
    isMeal: Boolean(item.isMeal),
  }));
}
