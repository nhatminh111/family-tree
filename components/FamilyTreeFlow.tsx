"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Person, RelationshipType } from "@/types/family";

interface FamilyTreeFlowProps {
  people: Person[];
  onNodeClick?: (person: Person) => void;
  onAddRelatedPerson?: (
    person: Person,
    relationshipType: RelationshipType
  ) => void;
}

// 1. NODE NGƯỜI (PERSON)
function PersonNode({
  data,
}: {
  data: {
    person: Person;
    onAddRelated?: (person: Person, type: RelationshipType) => void;
  };
}) {
  const { person, onAddRelated } = data;

  const genderColors = {
    male: "bg-blue-50 border-blue-400",
    female: "bg-pink-50 border-pink-400",
    other: "bg-purple-50 border-purple-400",
  };

  const genderIcons = {
    male: "♂",
    female: "♀",
    other: "⚧",
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${
        genderColors[person.gender]
      } shadow-lg min-w-[150px] relative group`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-2 h-2 bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-2 h-2 bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-2 h-2 bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2 h-2 bg-gray-400"
      />

      <div className="flex flex-col items-center">
        {person.image ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md mb-2">
            <img
              src={person.image}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 ${
              genderColors[person.gender]
            } bg-opacity-50`}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h3 className="font-bold text-sm text-gray-800 text-center mb-1">
          {person.name}
        </h3>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span>{genderIcons[person.gender]}</span>
          <span className="capitalize">
            {person.gender === "male"
              ? "Nam"
              : person.gender === "female"
              ? "Nữ"
              : "Khác"}
          </span>
        </p>
      </div>

      {onAddRelated && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRelated(person, "child");
            }}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 shadow-md"
          >
            + Con
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRelated(person, "spouse");
            }}
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 shadow-md"
          >
            + Vợ/Chồng
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRelated(person, "parent");
            }}
            className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 shadow-md"
          >
            + Cha/Mẹ
          </button>
        </div>
      )}
    </div>
  );
}

// 2. NODE TRUNG GIAN (MARRIAGE NODE)
const MarriageNode = ({ data }: { data: any }) => {
  return (
    <div className="w-1 h-1 bg-transparent relative">
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="opacity-0"
      />
    </div>
  );
};

const nodeTypes = {
  person: PersonNode,
  marriage: MarriageNode,
};

const relationshipLabels: Record<RelationshipType, string> = {
  parent: "Cha/Mẹ",
  child: "Con",
  spouse: "Vợ/Chồng",
  sibling: "Anh/Chị/Em",
  grandparent: "Ông/Bà",
  grandchild: "Cháu",
  uncle: "Chú/Bác/Cậu",
  aunt: "Cô/Dì",
  cousin: "Anh/Chị/Em họ",
  other: "Khác",
};

function FamilyTreeFlowInner({
  people,
  onNodeClick,
  onAddRelatedPerson,
}: FamilyTreeFlowProps) {
  // Load vị trí nodes đã được user kéo thả từ localStorage
  const loadSavedPositions = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nodePositions');
      if (saved) {
        try {
          const positions = JSON.parse(saved);
          return new Map(Object.entries(positions));
        } catch (e) {
          console.error('Error loading node positions:', e);
        }
      }
    }
    return new Map();
  }, []);

  const [savedPositions, setSavedPositions] = useState<Map<string, { x: number; y: number }>>(loadSavedPositions);

  // Reload positions khi people thay đổi
  useEffect(() => {
    setSavedPositions(loadSavedPositions());
  }, [people.length, loadSavedPositions]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (people.length === 0) return { nodes: [], edges: [] };

    // --- A. TÍNH TOÁN VỊ TRÍ (HIERARCHY) ---
    // Tìm các node bắt đầu (có thể là con cháu hoặc tổ tiên, thuật toán sẽ tự cân bằng)
    const findRoots = () => {
      // Tìm tất cả những người đã được ai đó đánh dấu là "con" (tức là có cha/mẹ)
      const hasParent = new Set<string>();
      people.forEach((person) => {
        person.relationships.forEach((rel) => {
          if (rel.type === "parent") {
            // person là cha/mẹ của rel.personId (đứa con)
            hasParent.add(rel.personId);
          }
        });
      });

      // Root là những người KHÔNG nằm trong danh sách có cha/mẹ
      const roots = people.filter((p) => !hasParent.has(p.id));
      return roots.length > 0 ? roots : [people[0]];
    };

    const roots = findRoots();
    const levels = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [];

    roots.forEach((root) => {
      levels.set(root.id, 0);
      queue.push({ id: root.id, level: 0 });
    });

    const visited = new Set<string>();

    // BFS để tính level tương đối
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const person = people.find((p) => p.id === id);
      if (!person) continue;

      person.relationships.forEach((rel) => {
        if (!levels.has(rel.personId)) {
          let nextLevel = level;
          if (rel.type === "child") {
            // Con luôn nằm DƯỚI cha mẹ (level cao hơn = xuống dưới)
            nextLevel = level + 1;
          } else if (rel.type === "parent") {
            // Cha mẹ luôn nằm TRÊN con (level thấp hơn = lên trên)
            nextLevel = level - 1;
          } else if (rel.type === "spouse") {
            // Vợ chồng ngang hàng
            nextLevel = level;
          } else if (rel.type === "sibling") {
            // Anh em ngang hàng
            nextLevel = level;
          }

          levels.set(rel.personId, nextLevel);
          queue.push({ id: rel.personId, level: nextLevel });
        }
      });
    }

    // Chuẩn hóa Level: Đảm bảo level nhỏ nhất bắt đầu từ 0
    let minLevel = 0;
    levels.forEach((l) => {
      if (l < minLevel) minLevel = l;
    });

    const nodePositions = new Map<string, { x: number; y: number }>();
    const byLevel = new Map<number, string[]>();

    people.forEach((person) => {
      const rawLevel = levels.get(person.id) || 0;
      const normalizedLevel = rawLevel - minLevel; // Shift để minLevel thành 0

      if (!byLevel.has(normalizedLevel)) byLevel.set(normalizedLevel, []);
      byLevel.get(normalizedLevel)!.push(person.id);
    });

    // Tính tọa độ X, Y - GIỮ NGUYÊN vị trí đã lưu, chỉ tính cho nodes mới
    byLevel.forEach((personIds, level) => {
      const spacing = 250;
      const totalWidth = (personIds.length - 1) * spacing;
      personIds.forEach((personId, index) => {
        // Kiểm tra xem node này đã có vị trí được lưu chưa
        const savedPos = savedPositions.get(personId);
        if (savedPos) {
          // Giữ nguyên vị trí đã lưu
          nodePositions.set(personId, savedPos);
        } else {
          // Tính vị trí mới cho node chưa có vị trí
          // Level 0 = trên cùng (y nhỏ), level tăng = xuống dưới (y tăng)
          const x = 500 + index * spacing - totalWidth / 2;
          const y = level * 220 + 100; // Level 0 ở y=100 (trên), level 1 ở y=320, level 2 ở y=540 (dưới)
          nodePositions.set(personId, { x, y });
        }
      });
    });

    // --- B. TẠO NODES ---
    const nodes: Node[] = people.map((person) => ({
      id: person.id,
      type: "person",
      position: nodePositions.get(person.id) || { x: 0, y: 0 },
      data: { person, onAddRelated: onAddRelatedPerson },
      draggable: true,
    }));

    // --- C. TẠO MARRIAGE NODES ---
    const marriageNodes: Node[] = [];
    const processedSpousePairs = new Set<string>();
    const personToMarriageNode = new Map<string, string>();

    people.forEach((person) => {
      const spouseRel = person.relationships.find((r) => r.type === "spouse");
      if (spouseRel) {
        const spouseId = spouseRel.personId;
        const pairId = [person.id, spouseId].sort().join("-");

        if (!processedSpousePairs.has(pairId)) {
          processedSpousePairs.add(pairId);
          const p1Pos = nodePositions.get(person.id);
          const p2Pos = nodePositions.get(spouseId);

          if (p1Pos && p2Pos) {
            const midX = (p1Pos.x + p2Pos.x) / 2 + 75;
            const midY = p1Pos.y + 50;
            const marriageNodeId = `marriage-${pairId}`;

            marriageNodes.push({
              id: marriageNodeId,
              type: "marriage",
              position: { x: midX, y: midY },
              data: { label: "" },
              draggable: false,
            });

            personToMarriageNode.set(person.id, marriageNodeId);
            personToMarriageNode.set(spouseId, marriageNodeId);
          }
        }
      }
    });
    nodes.push(...marriageNodes);

    // --- D. TẠO EDGES ---
    const edges: Edge[] = [];
    const createdEdges = new Set<string>();

    // Helper function to check if target exists
    const targetExists = (targetId: string) => {
      return people.some(p => p.id === targetId);
    };

    // Helper function to create unique edge ID
    const createEdgeId = (source: string, target: string, type: string) => {
      return [source, target].sort().join(`-${type}-`);
    };

    people.forEach((person) => {
      person.relationships.forEach((rel) => {
        // Kiểm tra target person có tồn tại không
        if (!targetExists(rel.personId)) return;

        // 1. VỢ CHỒNG (SPOUSE)
        if (rel.type === "spouse") {
          const edgeId = createEdgeId(person.id, rel.personId, "spouse");
          if (!createdEdges.has(edgeId)) {
            createdEdges.add(edgeId);
            edges.push({
              id: edgeId,
              source: person.id,
              target: rel.personId,
              sourceHandle: "right",
              targetHandle: "left",
              label: "💕 Vợ/Chồng",
              type: "straight",
              style: { stroke: "#10b981", strokeWidth: 3 },
              labelStyle: { fill: "#10b981", fontWeight: 700, fontSize: 11 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9, rx: 4, ry: 4 },
              labelBgPadding: [4, 6],
            });
          }
        }

        // 2. CON CÁI (CHILD) - Vẽ dây nối từ MỖI parent xuống con
        else if (rel.type === "child") {
          const childId = rel.personId;
          // Tạo edge ID unique cho mỗi cặp parent-child (để mỗi parent có edge riêng)
          const edgeId = `${person.id}-child-${childId}`;
          
          // Kiểm tra xem đã có edge này chưa (tránh duplicate)
          if (!createdEdges.has(edgeId)) {
            createdEdges.add(edgeId);
            
            // Luôn tạo edge từ parent này xuống con
            // Nếu cả 2 vợ chồng đều có quan hệ child, sẽ có 2 edges riêng biệt
            edges.push({
              id: edgeId,
              source: person.id,
              target: childId,
              sourceHandle: "bottom",
              targetHandle: "top",
              label: "Con",
              type: "smoothstep",
              style: { stroke: "#8b5cf6", strokeWidth: 3 },
              labelStyle: { fill: "#8b5cf6", fontSize: 11, fontWeight: 600 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9, rx: 4, ry: 4 },
              labelBgPadding: [4, 6],
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#8b5cf6",
                width: 20,
                height: 20,
              },
            });
          }
        }

        // 3. CHA MẸ (PARENT) - Vẽ ngược lại từ con lên cha mẹ
        else if (rel.type === "parent") {
          const edgeId = createEdgeId(person.id, rel.personId, "parent");
          if (!createdEdges.has(edgeId)) {
            createdEdges.add(edgeId);
            edges.push({
              id: edgeId,
              source: person.id,
              target: rel.personId,
              sourceHandle: "top",
              targetHandle: "bottom",
              label: "Cha/Mẹ",
              type: "smoothstep",
              style: { stroke: "#8b5cf6", strokeWidth: 3 },
              labelStyle: { fill: "#8b5cf6", fontSize: 11, fontWeight: 600 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9, rx: 4, ry: 4 },
              labelBgPadding: [4, 6],
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#8b5cf6",
                width: 20,
                height: 20,
              },
            });
          }
        }

        // 4. ANH CHỊ EM (SIBLING)
        else if (rel.type === "sibling") {
          const edgeId = createEdgeId(person.id, rel.personId, "sibling");
          if (!createdEdges.has(edgeId)) {
            createdEdges.add(edgeId);
            edges.push({
              id: edgeId,
              source: person.id,
              target: rel.personId,
              sourceHandle: "top",
              targetHandle: "top",
              label: "Anh/Chị/Em",
              type: "smoothstep",
              style: {
                stroke: "#f59e0b",
                strokeWidth: 2.5,
                strokeDasharray: "5 5",
              },
              labelStyle: { fill: "#f59e0b", fontSize: 11, fontWeight: 600 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9, rx: 4, ry: 4 },
              labelBgPadding: [4, 6],
            });
          }
        }

        // 5. CÁC QUAN HỆ KHÁC
        else {
          const edgeId = `${person.id}-${rel.type}-${rel.personId}`;
          if (!createdEdges.has(edgeId)) {
            createdEdges.add(edgeId);
            edges.push({
              id: edgeId,
              source: person.id,
              target: rel.personId,
              label: relationshipLabels[rel.type] || rel.label || "Quan hệ",
              type: "smoothstep",
              style: { stroke: "#9ca3af", strokeWidth: 2 },
              labelStyle: { fill: "#9ca3af", fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.8, rx: 4, ry: 4 },
              labelBgPadding: [4, 6],
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#9ca3af",
                width: 15,
                height: 15,
              },
            });
          }
        }
      });
    });

    // Debug log
    console.log("Created edges:", edges.length, edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })));

    return { nodes, edges };
  }, [people, onAddRelatedPerson, savedPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Debounce timer cho việc lưu vị trí
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Lưu vị trí khi user kéo thả nodes (với debounce 2 giây)
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    
    // Lưu vị trí khi node được di chuyển
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const nodeId = change.id;
        const currentPositions = loadSavedPositions();
        currentPositions.set(nodeId, change.position);
        setSavedPositions(currentPositions);
        
        // Clear timer cũ
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        
        // Set loading state
        setIsSaving(true);
        
        // Debounce: Lưu sau 2 giây
        saveTimerRef.current = setTimeout(() => {
          const positions: Record<string, { x: number; y: number }> = {};
          currentPositions.forEach((pos, id) => {
            positions[id] = pos;
          });
          localStorage.setItem('nodePositions', JSON.stringify(positions));
          setIsSaving(false);
          saveTimerRef.current = null;
        }, 2000);
      }
    });
  }, [onNodesChange, loadSavedPositions]);

  useEffect(() => {
    // Khi có nodes mới, giữ nguyên vị trí đã lưu
    setNodes(currentNodes => {
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
      const updatedNodes = initialNodes.map(newNode => {
        // Ưu tiên vị trí đã lưu trong localStorage
        const savedPos = savedPositions.get(newNode.id);
        if (savedPos) {
          return {
            ...newNode,
            position: savedPos,
          };
        }
        
        // Nếu không có vị trí đã lưu, giữ nguyên vị trí hiện tại (nếu node đã tồn tại)
        const existingNode = nodeMap.get(newNode.id);
        if (existingNode && existingNode.data?.person) {
          return {
            ...newNode,
            position: existingNode.position,
            data: existingNode.data,
          };
        }
        
        return newNode;
      });
      return updatedNodes;
    });
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, savedPositions]);

  // Cleanup timer khi component unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data?.person) onNodeClick(node.data.person);
    },
    [onNodeClick]
  );

  if (people.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-lg">
        <p className="text-gray-500 text-lg">
          Chưa có người nào trong cây gia phả
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Hãy thêm người đầu tiên để bắt đầu!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 shadow-lg relative">
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Đang lưu vị trí...</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const person = node.data?.person as Person;
            if (person?.gender === "male") return "#3b82f6";
            if (person?.gender === "female") return "#ec4899";
            return "#a855f7";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

export default function FamilyTreeFlow(props: FamilyTreeFlowProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeFlowInner {...props} />
    </ReactFlowProvider>
  );
}
