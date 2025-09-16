'use server';
/**
 * @fileOverview A flow to determine the color of a node in the Mind Atlas based on the primary emotion associated with the artifact.
 *
 * - getNodeColor - A function that takes an emotion as input and returns a color.
 * - NodeColorInput - The input type for the getNodeColor function.
 * - NodeColorOutput - The return type for the getNodeColor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NodeColorInputSchema = z.object({
  emotion: z
    .string()
    .describe('The primary emotion associated with the artifact.'),
});
export type NodeColorInput = z.infer<typeof NodeColorInputSchema>;

const NodeColorOutputSchema = z.object({
  color: z.string().describe('The color associated with the emotion.'),
});
export type NodeColorOutput = z.infer<typeof NodeColorOutputSchema>;

export async function getNodeColor(input: NodeColorInput): Promise<NodeColorOutput> {
  return nodeColorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'nodeColorPrompt',
  input: {schema: NodeColorInputSchema},
  output: {schema: NodeColorOutputSchema},
  prompt: `You are an expert in color psychology. Given the primary emotion of an artifact, determine an appropriate color to represent it in a Mind Atlas visualization. Return the color as a hex code.

Emotion: {{{emotion}}}`,
});

const nodeColorFlow = ai.defineFlow(
  {
    name: 'nodeColorFlow',
    inputSchema: NodeColorInputSchema,
    outputSchema: NodeColorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
