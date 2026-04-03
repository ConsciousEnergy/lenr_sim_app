"""Theory Relationship Data Model for the LENR Relevance Map."""
from .graph import TheoryGraph
from .nodes import TheoryNode, TheoryEdge, PHYSICAL_PROPERTIES_TAXONOMY

def topological_sort(graph: TheoryGraph, enabled=None):
    """Convenience: return theory IDs in dependency order."""
    return graph.topological_sort(enabled)

__all__ = ["TheoryGraph", "TheoryNode", "TheoryEdge", "PHYSICAL_PROPERTIES_TAXONOMY", "topological_sort"]