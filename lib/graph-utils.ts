import type { Artifact } from "@/lib/types";

/**
 * Identifies the most connected artifacts (hubs) in the graph.
 * @param artifacts - An array of all artifacts.
 * @param count - The number of hub artifacts to return.
 * @returns An array of the top `count` hub artifacts.
 */
export function getHubArtifacts(artifacts: Artifact[], count: number): Artifact[] {
  const linkCounts = new Map<string, number>();

  artifacts.forEach((a) => {
    // Initialize with own links
    linkCounts.set(a.id, (linkCounts.get(a.id) || 0) + a.linkedTo.length);
    // Add to the count of artifacts it links to
    a.linkedTo.forEach((linkedId) => {
      linkCounts.set(linkedId, (linkCounts.get(linkedId) || 0) + 1);
    });
  });

  const sortedArtifactIds = Array.from(linkCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);

  return sortedArtifactIds
    .slice(0, count)
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => !!a);
}

/**
 * Identifies artifacts that have no connections to or from any other artifact.
 * @param artifacts - An array of all artifacts.
 * @returns An array of isolated artifacts.
 */
export function getIsolatedArtifacts(artifacts: Artifact[]): Artifact[] {
  const allLinkedIds = new Set<string>();
  artifacts.forEach((artifact) => {
    if (artifact.linkedTo.length > 0) {
      allLinkedIds.add(artifact.id);
      artifact.linkedTo.forEach((id) => allLinkedIds.add(id));
    }
  });

  return artifacts.filter(
    (artifact) =>
      artifact.linkedTo.length === 0 && !allLinkedIds.has(artifact.id)
  );
}
