import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storagePath, filename } = await req.json()
  if (!storagePath) return NextResponse.json({ error: 'No file path' }, { status: 400 })

  // Download PDF from Supabase Storage server-side (no payload limit)
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('reports')
    .download(storagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: `Download failed: ${downloadError?.message}` }, { status: 500 })
  }

  // Convert blob to base64
  const arrayBuffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const systemPrompt = `You are a medical data extraction specialist. Extract blood test results from the PDF.
Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "report_date": "YYYY-MM",
  "hba1c": number, "glucose": number, "triglycerides": number,
  "hdl": number, "ldl": number, "total_cholesterol": number,
  "hemoglobin": number, "creatinine": number, "tsh": number,
  "vitamin_d": number, "wbc": number, "platelets": number,
  "uric_acid": number, "alt": number, "ast": number
}
Numeric values only. No units, no text. Just the JSON.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
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
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    // Clean up uploaded file on failure
    await supabase.storage.from('reports').remove([storagePath])
    return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 500 })
  }

  const message = await anthropicRes.json()
  const text = (message.content as any[]).map((c: any) => c.text || '').join('')
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // Build report, strip nulls
  const report: any = { user_id: user.id, source: 'pdf', filename }
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== null && v !== undefined) report[k] = v
  }
  if (!report.report_date) report.report_date = new Date().toISOString().slice(0, 7)

  // Save to DB
  const { data, error } = await supabase.from('reports').insert(report).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clean up PDF from storage (we only needed it for extraction)
  await supabase.storage.from('reports').remove([storagePath])

  return NextResponse.json({ report: data })
}
