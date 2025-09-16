"use server";
/**
 * @fileOverview A flow to generate a short, allegorical story from a set of artifacts.
 *
 * - weaveDream - Generates a story.
 * - WeaveDreamInput - The input type for the weaveDream function.
 * - WeaveDreamOutput - The return type for the weaveDream function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const ArtifactSummarySchema = z.object({
  title: z.string(),
  primaryEmotion: z.string(),
  keywords: z.array(z.string()),
});

const WeaveDreamInputSchema = z.object({
  artifacts: z
    .array(ArtifactSummarySchema)
    .min(1)
    .describe("A cluster of artifacts to be woven into a story."),
});
export type WeaveDreamInput = z.infer<typeof WeaveDreamInputSchema>;

const WeaveDreamOutputSchema = z.object({
  title: z.string().describe("A creative, evocative title for the story."),
  story: z
    .string()
    .describe(
      "The generated allegorical story or poem, written in a thoughtful and slightly fantastical style. It should be 2-4 paragraphs long."
    ),
});
export type WeaveDreamOutput = z.infer<typeof WeaveDreamOutputSchema>;

export async function weaveDream(
  input: WeaveDreamInput
): Promise<WeaveDreamOutput> {
  return dreamWeavingFlow(input);
}

const prompt = ai.definePrompt({
  name: "dreamWeavingPrompt",
  input: { schema: WeaveDreamInputSchema },
  output: { schema: WeaveDreamOutputSchema },
  prompt: `You are a Dream Weaver, an AI that transforms memories into short, allegorical stories or poems.

Your task is to take a cluster of interconnected journal entries (artifacts) and synthesize their core emotions and themes into a single, cohesive narrative. The story should be thoughtful, slightly fantastical, and evocative. It should not be a direct summary, but a metaphorical interpretation of the user's experiences.

Generate a creative title and a story that is 2-4 paragraphs long.

Analyze the following artifacts to inspire your creation:
{{#each artifacts}}
- Title: {{{this.title}}}, Emotion: {{{this.primaryEmotion}}}, Keywords: [{{#each this.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}
`,
});

const dreamWeavingFlow = ai.defineFlow(
  {
    name: "dreamWeavingFlow",
    inputSchema: WeaveDreamInputSchema,
    outputSchema: WeaveDreamOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
