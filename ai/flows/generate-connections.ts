"use server";
/**
 * @fileOverview A flow to suggest connections between a new artifact and existing ones.
 *
 * - generateConnections - A function that takes a new artifact and a list of existing artifacts and returns connection suggestions.
 * - GenerateConnectionsInput - The input type for the generateConnections function.
 * - GenerateConnectionsOutput - The return type for the generateConnections function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const ArtifactInputSchema = z.object({
  id: z.string(),
  content: z.string(),
});

const AISuggestionSchema = z.object({
  linkedArtifactId: z.string().describe("The ID of the existing artifact."),
  connectionReason: z
    .string()
    .describe(
      "A brief, 1-2 sentence explanation of the conceptual or emotional link."
    ),
});

const GenerateConnectionsInputSchema = z.object({
  newArtifact: ArtifactInputSchema,
  existingArtifacts: z.array(ArtifactInputSchema),
});
export type GenerateConnectionsInput = z.infer<
  typeof GenerateConnectionsInputSchema
>;

const GenerateConnectionsOutputSchema = z.object({
  suggestions: z.array(AISuggestionSchema),
});
export type GenerateConnectionsOutput = z.infer<
  typeof GenerateConnectionsOutputSchema
>;

export async function generateConnections(
  input: GenerateConnectionsInput
): Promise<GenerateConnectionsOutput> {
  return generateConnectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: "generateConnectionsPrompt",
  input: { schema: GenerateConnectionsInputSchema },
  output: { schema: GenerateConnectionsOutputSchema },
  prompt: `You are a specialized AI model that analyzes personal journal entries. Your task is to identify meaningful conceptual or emotional connections between a new entry and a list of previous entries. Do not imagine connections; base your analysis strictly on the provided text.

Analyze the following 'new artifact' and determine if it has a strong conceptual or emotional connection to any of the 'existing artifacts'. For each connection you find, provide the ID of the existing artifact and a very brief explanation of the connection.

New Artifact:
ID: {{{newArtifact.id}}}
Content: {{{newArtifact.content}}}

Existing Artifacts:
{{#each existingArtifacts}}
- ID: {{{this.id}}}, Content: {{{this.content}}}
{{/each}}
`,
});

const generateConnectionsFlow = ai.defineFlow(
  {
    name: "generateConnectionsFlow",
    inputSchema: GenerateConnectionsInputSchema,
    outputSchema: GenerateConnectionsOutputSchema,
  },
  async (input) => {
    // Don't run if there's nothing to compare to.
    if (input.existingArtifacts.length === 0) {
      return { suggestions: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);

    