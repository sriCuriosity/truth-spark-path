import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import process from "node:process";

export const chatWithMentor = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string(),
      systemPrompt: z.string(),
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error("Supabase URL not configured on the server.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/llm-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.accessToken}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        messages: [
          { role: "system", content: data.systemPrompt },
          ...data.messages,
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM Proxy Error: ${response.status} - ${errorText}`);
    }

    const resData = await response.json();
    return {
      content: resData.choices?.[0]?.message?.content || "No response received.",
    };
  });
