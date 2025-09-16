"use server";
/**
 * @fileOverview A flow to find a "hidden" connection between an isolated artifact and an influential one.
 *
 * - findHiddenConnection - Finds a potential connection between an isolated node and a hub node.
 * - FindHiddenConnectionInput - The input type for the findHiddenConnection function.
 * - FindHiddenConnectionOutput - The return type for the findHiddenConnection function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const ArtifactInfoSchema = z.object({
  id: z.string(),
  content: z.string(),
});

const FindHiddenConnectionInputSchema = z.object({
  isolatedArtifact: ArtifactInfoSchema,
  hubArtifacts: z.array(ArtifactInfoSchema),
});
export type FindHiddenConnectionInput = z.infer<
  typeof FindHiddenConnectionInputSchema
>;

const FindHiddenConnectionOutputSchema = z.object({
  isConnectionFound: z
    .boolean()
    .describe(
      "Whether a meaningful thematic or emotional connection was found."
    ),
  hubArtifactId: z
    .string()
    .optional()
    .describe(
      "The ID of the hub artifact that connects to the isolated one. Only present if a connection is found."
    ),
  explanation: z
    .string()
    .optional()
    .describe(
      "A brief, 1-sentence explanation of the hidden connection. Only present if a connection is found."
    ),
});
export type FindHiddenConnectionOutput = z.infer<
  typeof FindHiddenConnectionOutputSchema
>;

export async function findHiddenConnection(
  input: FindHiddenConnectionInput
): Promise<FindHiddenConnectionOutput> {
  return findHiddenConnectionFlow(input);
}

const prompt = ai.definePrompt({
  name: "findHiddenConnectionPrompt",
  input: { schema: FindHiddenConnectionInputSchema },
  output: { schema: FindHiddenConnectionOutputSchema },
  prompt: `You are an emotional analyst AI. Your task is to find a single, meaningful hidden connection between an 'isolated artifact' and one of the user's 'hub artifacts' (their most influential entries).

Analyze the content of the isolated artifact. Then, review the hub artifacts and determine if a strong thematic or emotional bridge exists to any ONE of them.

If you find a compelling connection, identify the hub artifact and provide a concise, one-sentence explanation for the link. If no strong connection exists, do not force one.

Isolated Artifact:
- ID: {{{isolatedArtifact.id}}}
- Content: {{{isolatedArtifact.content}}}

Hub Artifacts:
{{#each hubArtifacts}}
- ID: {{{this.id}}}, Content: {{{this.content}}}
{{/each}}
`,
});

const findHiddenConnectionFlow = ai.defineFlow(
  {
    name: "findHiddenConnectionFlow",
    inputSchema: FindHiddenConnectionInputSchema,
    outputSchema: FindHiddenConnectionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
