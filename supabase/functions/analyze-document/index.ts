import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const analyzeRequestSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  content: z.string().min(1, "Content cannot be empty").max(10 * 1024 * 1024, "Content exceeds 10MB limit"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = analyzeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { documentId, content } = validationResult.data;

    console.log("Analyzing document:", documentId);

    // Initialize Supabase client with user's JWT (enforces RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Prepare AI prompt for document analysis
    const analysisPrompt = `Analyze the following document and provide:
1. A concise summary (2-3 sentences)
2. 5-7 key points or main ideas
3. Overall sentiment (positive, neutral, or negative)
4. 5-10 important keywords
5. Named entities (people, organizations, locations, etc.)

Document content:
${content.substring(0, 10000)}

Respond in JSON format with this structure:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "sentiment": "...",
  "keywords": ["...", "..."],
  "entities": {
    "people": ["...", "..."],
    "organizations": ["...", "..."],
    "locations": ["...", "..."]
  }
}`;

    console.log("Calling Lovable AI for analysis");

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert document analyzer. Provide structured, accurate analysis in JSON format.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI analysis request failed");
      throw new Error("AI analysis service temporarily unavailable");
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0]?.message?.content || "{}";

    console.log("Analysis received from AI");

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Analysis response parsing failed");
      // Fallback analysis
      analysis = {
        summary: "Document uploaded successfully. Analysis details may be incomplete.",
        key_points: ["Content available for chat"],
        sentiment: "neutral",
        keywords: [],
        entities: {},
      };
    }

    // Update document with analysis
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        summary: analysis.summary,
        key_points: analysis.key_points,
        sentiment: analysis.sentiment,
        keywords: analysis.keywords,
        entities: analysis.entities,
        status: "completed",
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Failed to save analysis results");
      throw new Error("Unable to save analysis results");
    }

    console.log("Document analysis completed successfully");

    return new Response(
      JSON.stringify({ success: true, analysis }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Document analysis failed");
    return new Response(
      JSON.stringify({ error: "Unable to analyze document. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
