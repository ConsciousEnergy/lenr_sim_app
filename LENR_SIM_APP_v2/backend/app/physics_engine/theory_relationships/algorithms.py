"""Topological sort and coupling analysis for theory graph."""
from typing import Dict, List

def topological_sort_from_adj(adj: Dict[str, List[str]]) -> List[str]:
    """Kahn's algorithm: return node IDs in dependency order."""
    all_ids = set(adj.keys())
    in_deg = {tid: 0 for tid in all_ids}
    for src, targets in adj.items():
        for tgt in targets:
            in_deg[tgt] = in_deg.get(tgt, 0) + 1
    queue = sorted([tid for tid, d in in_deg.items() if d == 0])
    result = []
    while queue:
        tid = queue.pop(0)
        result.append(tid)
        for downstream in sorted(adj.get(tid, [])):
            in_deg[downstream] -= 1
            if in_deg[downstream] == 0:
                queue.append(downstream)
    remaining = all_ids - set(result)
    result.extend(sorted(remaining))
    return result