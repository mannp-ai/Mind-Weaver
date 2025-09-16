
"use client";

import React, { useEffect, useRef, useCallback, useLayoutEffect, useState } from "react";
import Cytoscape, { type LayoutOptions, type EdgeSingular, type NodeSingular } from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import cola from 'cytoscape-cola';
import type { Artifact, HiddenConnection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useTheme } from "next-themes";


Cytoscape.use(cola);

type MindAtlasProps = {
  artifacts: Artifact[];
  onNodeClick: (artifactId: string) => void;
  onNodeDoubleClick: (artifactId: string) => void;
  selectedNodeId: string | null;
  searchTerm: string;
  previewConnection: HiddenConnection | null;
};

const baseLayoutOptions: LayoutOptions = {
    name: 'cola',
    animate: true,
    padding: 60,
    nodeSpacing: 100, 
    edgeLengthVal: 80,
    fit: true,
    animationDuration: 500,
    nodeDimensionsIncludeLabels: false, 
    // @ts-ignore - cola specific options
    unconstrIter: 15,
    userConstIter: 30,
    allConstIter: 30,
};


export default function MindAtlas({ artifacts, onNodeClick, onNodeDoubleClick, selectedNodeId, searchTerm, previewConnection }: MindAtlasProps) {
  const cyRef = useRef<Cytoscape.Core | null>(null);
  const { resolvedTheme } = useTheme();
  
  const [layoutOptions] = useState<LayoutOptions>(baseLayoutOptions);

  const elements = React.useMemo(() => {
    const nodes = artifacts.map(artifact => ({
      data: {
        id: artifact.id,
        label: artifact.title,
        content: artifact.content,
        color: artifact.color,
      }
    }));

    const artifactIds = new Set(artifacts.map(a => a.id));

    const edges = artifacts.flatMap(sourceArtifact =>
      sourceArtifact.linkedTo
        // Ensure the target node is also in the current visible set
        .filter(targetId => artifactIds.has(targetId))
        .map(targetId => ({
          data: {
            id: `${sourceArtifact.id}-${targetId}`,
            source: sourceArtifact.id,
            target: targetId
          }
        }))
    );

    return CytoscapeComponent.normalizeElements({ nodes, edges });
  }, [artifacts]);

  const stylesheet: Cytoscape.Stylesheet[] = React.useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'width': 20,
        'height': 20,
        'color': resolvedTheme === 'dark' ? '#FFF' : '#000',
        'font-size': '14px',
        'font-family': 'var(--font-poppins), sans-serif',
        'font-weight': '500',
        'text-wrap': 'wrap',
        'text-max-width': '200px',
        'border-width': 2,
        'border-color': 'data(color)',
        'transition-property': 'background-color, border-color, width, height, box-shadow, opacity',
        'transition-duration': '0.3s',
        'opacity': 1,
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 8,
        'text-background-color': resolvedTheme === 'dark' ? 'hsl(var(--background))' : 'hsl(var(--background))',
        'text-background-opacity': 0.85,
        'text-background-padding': '4px',
        'text-background-shape': 'round-rectangle',
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': resolvedTheme === 'dark' ? 'hsl(var(--border) / 0.5)' : 'hsl(var(--border))',
        'target-arrow-shape': 'none',
        'curve-style': 'bezier',
        'transition-property': 'line-color, target-arrow-color, opacity, width',
        'transition-duration': '0.3s',
        'transition-timing-function': 'ease-in-out',
        'opacity': 1,
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': 'hsl(var(--accent))',
        'width': 25,
        'height': 25,
        'border-style': 'solid',
      },
    },
     {
      selector: '.preview-edge',
      style: {
        'line-style': 'dashed',
        'line-color': 'hsl(var(--accent))',
        'target-arrow-color': 'hsl(var(--accent))',
        'width': 2.5,
        'line-dash-pattern': [6, 3],
      }
    },
    {
      selector: '.faded',
      style: {
          'opacity': 0.25,
          'transition-duration': '0.2s',
      },
    }
  ], [resolvedTheme]);

  const handleZoom = (factor: number) => {
    const cy = cyRef.current;
    if (cy) {
      cy.stop(true, true);
      cy.animate({
        zoom: cy.zoom() * factor,
        duration: 200,
        easing: 'ease-out'
      });
    }
  };

  const fitGraph = (nodesToFit?: any) => {
    const cy = cyRef.current;
    if (cy) {
      cy.stop(true, true);
      const fitOptions = {
         eles: nodesToFit || cy.elements(),
         padding: nodesToFit ? 120 : 80,
      };
      cy.animate({ fit: fitOptions }, { duration: 500, easing: 'ease-out' });
    }
  };
  
  const stableOnNodeClick = useCallback(onNodeClick, [onNodeClick]);
  const stableOnNodeDoubleClick = useCallback(onNodeDoubleClick, [onNodeDoubleClick]);

  useLayoutEffect(() => {
    const cy = cyRef.current;
    if (cy && elements.length > 0) {
      const layout = cy.layout({ ...layoutOptions, animate: false });
      layout.one('layoutstop', () => {
        fitGraph();
      });
      layout.run();
    }
  }, [elements, layoutOptions]); // Only run when elements change for initial layout
  

  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      
      const handleNodeTap = (event: Cytoscape.EventObject) => {
        const nodeId = event.target.id();
        stableOnNodeClick(nodeId);
      };
      const handleNodeDblTap = (event: Cytoscape.EventObject) => {
        const nodeId = event.target.id();
        stableOnNodeDoubleClick(nodeId);
      }
      
      cy.removeListener('tap');
      cy.removeListener('dbltap');
      cy.on('tap', 'node', handleNodeTap);
      cy.on('dbltap', 'node', handleNodeDblTap);

      return () => {
        if (cy && !cy.destroyed()) {
          cy.removeListener('tap');
          cy.removeListener('dbltap');
        }
      };
    }
  }, [stableOnNodeClick, stableOnNodeDoubleClick]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
  
    // Animate selection
    cy.startBatch();
    cy.nodes().unselect();
    if (selectedNodeId) {
      const selectedNode = cy.getElementById(selectedNodeId);
      if (selectedNode.length > 0) {
        selectedNode.select();
      }
    }
    cy.endBatch();
  
  }, [selectedNodeId]);


  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.startBatch();
    const allElements = cy.elements();
    
    if (searchTerm) {
        const searchResults = cy.nodes().filter(node => {
            const content = node.data('content') || '';
            const label = node.data('label') || '';
            return content.toLowerCase().includes(searchTerm.toLowerCase()) || label.toLowerCase().includes(searchTerm.toLowerCase());
        });
        const faded = allElements.not(searchResults.union(searchResults.neighborhood()));
        
        allElements.removeClass('faded');
        faded.addClass('faded');

    } else {
       allElements.removeClass('faded');
    }
    cy.endBatch();
  }, [searchTerm]);

  useLayoutEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Clean up any existing preview edges
    cy.edges('.preview-edge').remove();

    cy.startBatch();
    if (previewConnection) {
      // Add the temporary edge
      const newEdge = cy.add({
        group: 'edges',
        data: {
          source: previewConnection.fromId,
          target: previewConnection.toId,
        },
        classes: 'preview-edge',
      });

      const fromNode = cy.getElementById(previewConnection.fromId);
      const toNode = cy.getElementById(previewConnection.toId);
      
      cy.elements().addClass('faded');
      fromNode.union(toNode).union(newEdge).removeClass('faded');

      fitGraph(fromNode.union(toNode));
      
    } else {
       cy.elements().removeClass('faded');
    }
    cy.endBatch();

  }, [previewConnection]);
  
  // Re-run the animated layout when layout options change
  useEffect(() => {
    const cy = cyRef.current;
    if (cy && cy.elements().length > 0) {
      cy.layout(layoutOptions).run();
    }
  }, [layoutOptions]);


  return (
    <div className="w-full h-full relative bg-background">
       <div className="w-full h-full bg-grid z-0">
         <CytoscapeComponent
          elements={elements}
          layout={{ name: 'preset' }} // We run layout manually
          stylesheet={stylesheet}
          style={{ width: '100%', height: '100%' }}
          cy={cy => { 
            if (cyRef.current !== cy) {
              cyRef.current = cy; 
            }
          }}
          minZoom={0.1}
          maxZoom={3.5}
          wheelSensitivity={0.2}
        />
       </div>
       <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => handleZoom(1.2)}>
                <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => handleZoom(0.8)}>
                <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => fitGraph()}>
                <Maximize className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
