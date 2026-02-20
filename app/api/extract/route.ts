import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { base64, filename } = await req.json()

  const systemPrompt = `You are a medical data extraction specialist. Extract blood test results from the PDF.
Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "report_date": "YYYY-MM",
  "hba1c": number,
  "glucose": number,
  "triglycerides": number,
  "hdl": number,
  "ldl": number,
  "total_cholesterol": number,
  "hemoglobin": number,
  "creatinine": number,
  "tsh": number,
  "vitamin_d": number,
  "wbc": number,
  "platelets": number,
  "uric_acid": number,
  "alt": number,
  "ast": number
}
Numeric values only. No units, no text. Just the JSON.`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: `Extract blood test values from: ${filename}` }
      ]
    }]
  })

  const text = message.content.map((c: any) => c.text || '').join('')
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // Remove null fields
  const report: any = {
    user_id: user.id,
    source: 'pdf',
    filename,
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== null && v !== undefined) report[k] = v
  }
  if (!report.report_date) report.report_date = new Date().toISOString().slice(0, 7)

  // Save to Supabase
  const { data, error } = await supabase.from('reports').insert(report).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ report: data })
}
