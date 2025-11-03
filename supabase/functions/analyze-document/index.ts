import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, content } = await req.json();

    console.log("Analyzing document:", documentId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
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
      console.error("Failed to parse AI response:", parseError);
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
      console.error("Error updating document:", updateError);
      throw updateError;
    }

    console.log("Document analysis completed successfully");

    return new Response(
      JSON.stringify({ success: true, analysis }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-document function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
