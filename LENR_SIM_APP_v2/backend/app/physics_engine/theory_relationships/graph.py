"""TheoryGraph class for LENR Relevance Map."""
from typing import Dict, List, Optional
from .nodes import TheoryNode, TheoryEdge, PHYSICAL_PROPERTIES_TAXONOMY
from . import defaults
from . import algorithms

class TheoryGraph:
    """Full theory relationship graph for the Relevance Map."""

    def __init__(
        self,
        nodes: Optional[List[TheoryNode]] = None,
        edges: Optional[List[TheoryEdge]] = None,
    ):
        self.nodes = nodes or defaults._build_default_nodes()
        self.edges = edges or defaults._build_default_edges()
        self._node_map = {n.theory_id: n for n in self.nodes}

    def get_node(self, theory_id: str) -> Optional[TheoryNode]:
        return self._node_map.get(theory_id)

    def get_edges_for(self, theory_id: str) -> List[TheoryEdge]:
        return [
            e for e in self.edges
            if e.source_id == theory_id or e.target_id == theory_id
        ]

    def get_shared_properties(self, t1: str, t2: str) -> List[str]:
        n1 = self._node_map.get(t1)
        n2 = self._node_map.get(t2)
        if not n1 or not n2:
            return []
        return list(set(n1.physical_properties) & set(n2.physical_properties))

    def filter_by_property(self, prop: str) -> List[TheoryNode]:
        return [n for n in self.nodes if prop in n.physical_properties]

    def filter_by_category(self, category: str) -> List[TheoryNode]:
        return [n for n in self.nodes if n.category == category]

    def filter_by_material(self, material: str) -> List[TheoryNode]:
        return [n for n in self.nodes if material in n.material_systems]

    # -- Coupling pipeline helpers (v0.3.3-beta) ----------------------------

    # Directed "extends" and "explains_observation" edges define a partial
    # order: source -> target means source should run BEFORE target so its
    # outputs can feed into the target's conditions.
    _DIRECTED_TYPES = {"extends", "explains_observation"}

    def _build_dependency_dag(
        self, enabled: Optional[List[str]] = None,
    ) -> Dict[str, List[str]]:
        """Return an adjacency list: {theory_id -> [theories that depend on it]}.

        Only considers directed relationship types (``extends``,
        ``explains_observation``).  If *enabled* is given, only those
        theory IDs are included.
        """
        all_ids = {n.theory_id for n in self.nodes}
        if enabled:
            all_ids = all_ids & set(enabled)

        adj: Dict[str, List[str]] = {tid: [] for tid in all_ids}
        for e in self.edges:
            if e.relationship_type not in self._DIRECTED_TYPES:
                continue
            src, tgt = e.source_id, e.target_id
            if src in all_ids and tgt in all_ids:
                adj.setdefault(src, []).append(tgt)
        return adj

    def topological_sort(
        self, enabled: Optional[List[str]] = None,
    ) -> List[str]:
        """Return theory IDs in dependency order (upstream first)."""
        return algorithms.topological_sort_from_adj(self._build_dependency_dag(enabled))

    def get_coupling_map(
        self, enabled: Optional[List[str]] = None,
    ) -> Dict[str, List[Dict]]:
        """Return a map of {target_id: [{source_id, relationship_type, shared_properties}]}.

        Only includes directed relationships (extends / explains_observation).
        """
        all_ids = {n.theory_id for n in self.nodes}
        if enabled:
            all_ids = all_ids & set(enabled)

        coupling: Dict[str, List[Dict]] = {}
        for e in self.edges:
            if e.relationship_type not in self._DIRECTED_TYPES:
                continue
            if e.source_id in all_ids and e.target_id in all_ids:
                coupling.setdefault(e.target_id, []).append({
                    "source_id": e.source_id,
                    "relationship_type": e.relationship_type,
                    "shared_properties": e.shared_properties,
                    "strength": e.strength,
                })
        return coupling

    def to_dict(self) -> Dict:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "properties_taxonomy": PHYSICAL_PROPERTIES_TAXONOMY,
        }