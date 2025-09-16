"use server";
/**
 * @fileOverview A flow to find a recurring negative pattern in a user's artifacts.
 *
 * - findRecurringPattern - Finds a potential pattern and suggests a habit.
 * - FindRecurringPatternInput - The input type for the findRecurringPattern function.
 * - FindRecurringPatternOutput - The return type for the findRecurringPattern function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const ArtifactSummarySchema = z.object({
  id: z.string(),
  primaryEmotion: z.string(),
  keywords: z.array(z.string()),
  linkedTo: z.array(z.string()),
});

const FindRecurringPatternInputSchema = z.object({
  artifacts: z.array(ArtifactSummarySchema),
});
export type FindRecurringPatternInput = z.infer<
  typeof FindRecurringPatternInputSchema
>;

const FindRecurringPatternOutputSchema = z.object({
  isPatternFound: z
    .boolean()
    .describe("Whether a recurring negative pattern was found."),
  pattern: z
    .object({
      from: z.string().describe("The starting concept of the pattern (e.g., 'work stress')."),
      to: z.string().describe("The resulting concept of the pattern (e.g., 'sleepless nights')."),
    })
    .optional(),
  explanation: z
    .string()
    .optional()
    .describe(
      "A brief, 1-sentence non-judgmental explanation of the pattern."
    ),
  suggestedHabit: z
    .string()
    .optional()
    .describe("A simple, actionable habit to help address the pattern."),
});
export type FindRecurringPatternOutput = z.infer<
  typeof FindRecurringPatternOutputSchema
>;

export async function findRecurringPattern(
  input: FindRecurringPatternInput
): Promise<FindRecurringPatternOutput> {
  return findRecurringPatternFlow(input);
}

const prompt = ai.definePrompt({
  name: "findRecurringPatternPrompt",
  input: { schema: FindRecurringPatternInputSchema },
  output: { schema: FindRecurringPatternOutputSchema },
  prompt: `You are an expert psychologist and data analyst. Your task is to analyze a user's journal entries (artifacts) to identify one significant, recurring negative behavior pattern.

Look for connections where one set of emotions or keywords consistently leads to another negative set. For example, entries about "work stress" might often be linked to entries about "insomnia" or "anxiety".

1.  **Analyze the data:** Review the provided artifact summaries, paying close attention to the primary emotions, keywords, and how they are linked.
2.  **Identify a pattern:** Find the most prominent recurring link between two negative concepts.
3.  **Explain the pattern:** Describe this connection in a single, non-judgmental sentence.
4.  **Suggest a habit:** Propose one simple, actionable habit the user could adopt to interrupt this negative cycle.

If no clear, strong pattern exists, do not force one. Set 'isPatternFound' to false and do not provide other fields.

Artifacts Summary:
{{#each artifacts}}
- ID: {{{this.id}}}, Emotion: {{{this.primaryEmotion}}}, Keywords: [{{#each this.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}], LinkedTo: [{{#each this.linkedTo}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}
`,
});

const findRecurringPatternFlow = ai.defineFlow(
  {
    name: "findRecurringPatternFlow",
    inputSchema: FindRecurringPatternInputSchema,
    outputSchema: FindRecurringPatternOutputSchema,
  },
  async (input) => {
    if (input.artifacts.length < 10) {
      return { isPatternFound: false };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
