import { loadEnvConfig } from '@next/env'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

loadEnvConfig(process.cwd())

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
)

const FoodSchema = z.object({
  foods: z.array(z.object({
    name: z.string(),
    calories_100g: z.number(),
    protein_100g: z.number(),
    carbs_100g: z.number(),
    fat_100g: z.number(),
  })),
})

async function main() {
  const dietPlan = readFileSync(join(process.cwd(), 'docs/diet-plan.md'), 'utf-8')

  console.log('Generating food list via Gemini...')

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: FoodSchema,
    prompt: `
You are a nutritionist generating a food database for a fitness tracking app.

Based on this diet plan, extract all specific foods mentioned AND add common Indian staple foods to make a comprehensive list of ~60 foods.

Diet plan context:
${dietPlan.slice(0, 8000)}

Generate accurate per-100g nutritional values for each food. Include:
1. All foods explicitly mentioned in the plan (eggs, oats, whey, banana, chicken, paneer, etc.)
2. Common Indian staples: dal (various), rice varieties, roti/chapati, various vegetables, Indian dairy products, common Indian proteins
3. Common supplements/extras: protein powder (generic whey), Greek yogurt, nuts, etc.

Return UNIQUE foods only (no duplicates). Be precise with nutritional data.
    `.trim(),
  })

  console.log(`Generated ${object.foods.length} foods. Inserting into DB...`)

  const { error } = await supabase
    .from('foods')
    .upsert(object.foods, { onConflict: 'name', ignoreDuplicates: false })

  if (error) {
    console.error('Insert error:', error)
    process.exit(1)
  }

  console.log(`✓ Seeded ${object.foods.length} foods`)
  object.foods.forEach(f =>
    console.log(`  ${f.name}: ${f.calories_100g} kcal, ${f.protein_100g}g protein`)
  )
}

main().catch(e => { console.error(e); process.exit(1) })
