"use client";

import { useState, useEffect } from "react";
import { Person, RelationshipType, Relationship } from "@/types/family";
import PersonForm from "@/components/PersonForm";
import RelationshipForm from "@/components/RelationshipForm";
import FamilyTreeFlow from "@/components/FamilyTreeFlow";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("familyTree");
    if (saved) {
      try {
        setPeople(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading family tree:", e);
      }
    }
  }, []);

  // Save to localStorage whenever people change
  useEffect(() => {
    localStorage.setItem("familyTree", JSON.stringify(people));
  }, [people]);

  const handleSavePerson = (
    person: Person,
    relatedPersonId?: string,
    relationshipType?: RelationshipType,
    autoAddSpouse?: boolean
  ) => {
    const createRelationship = (
      targetId: string,
      type: RelationshipType
    ): Relationship => ({
      id: uuidv4(),
      personId: targetId,
      type,
    });

    if (editingPerson) {
      // Update existing person
      setPeople((prev) => prev.map((p) => (p.id === person.id ? person : p)));
    } else {
      // Add new person
      setPeople((prev) => {
        // If relationship is specified, add bidirectional relationships
        if (relatedPersonId && relationshipType) {
          const relatedPerson = prev.find((p) => p.id === relatedPersonId);
          if (relatedPerson) {
            // Create new person with relationship
            const personWithRelationship: Person = {
              ...person,
              relationships: [
                ...person.relationships,
                createRelationship(relatedPersonId, relationshipType),
              ],
            };

            // Add reverse relationship to existing person
            const reverseType = getReverseRelationship(relationshipType);

            // If adding a parent, automatically find other parent and make them spouses
            let otherParentId: string | undefined;
            if (relationshipType === "parent") {
              // Check if there's a pending parent2Id from form
              const pendingParent2Id = (window as any).pendingParent2Id;
              if (pendingParent2Id) {
                otherParentId = pendingParent2Id;
                delete (window as any).pendingParent2Id;
              } else {
                // Find other parent of the child (auto-detect)
                const otherParentRel = relatedPerson.relationships.find(
                  (r) => r.type === "parent"
                );
                if (otherParentRel) {
                  otherParentId = otherParentRel.personId;
                }
              }
              
              // If child has another parent, make the two parents spouses
              if (otherParentId) {
                const otherParentPerson = prev.find((p) => p.id === otherParentId);
                if (otherParentPerson) {
                  // Add spouse relationship between the two parents
                  personWithRelationship.relationships.push(
                    createRelationship(otherParentId, "spouse")
                  );
                }
              }
            }
            
            // If adding a child, automatically find spouse and add relationship
            let spouseId: string | undefined;
            if (relationshipType === "child") {
              // Find spouse of the parent (auto-detect)
              const spouseRelationship = relatedPerson.relationships.find(
                (r) => r.type === "spouse"
              );
              if (spouseRelationship) {
                spouseId = spouseRelationship.personId;
              }
              
              // Add relationship to child with second parent
              if (spouseId) {
                const spousePerson = prev.find((p) => p.id === spouseId);
                if (spousePerson) {
                  // Add relationship to child with spouse (child relationship)
                  personWithRelationship.relationships.push(
                    createRelationship(spouseId, "child")
                  );
                }
              }
            }

            if (reverseType) {
              const updatedPeople = prev.map((p) => {
                if (p.id === relatedPersonId) {
                  // Add reverse relationship (parent) to the person
                  return {
                    ...p,
                    relationships: [
                      ...p.relationships,
                      createRelationship(person.id, reverseType),
                    ],
                  };
                } else if (spouseId && p.id === spouseId) {
                  // Add reverse relationship (parent) to the spouse (when adding child)
                  return {
                    ...p,
                    relationships: [
                      ...p.relationships,
                      createRelationship(person.id, reverseType),
                    ],
                  };
                } else if (otherParentId && p.id === otherParentId) {
                  // Add reverse spouse relationship to the other parent (when adding parent)
                  // Also ensure the child has parent relationship with this other parent
                  const hasChildRel = p.relationships.some(
                    (r) => r.personId === relatedPersonId && r.type === "parent"
                  );
                  return {
                    ...p,
                    relationships: [
                      ...p.relationships,
                      createRelationship(person.id, "spouse"),
                      // Add parent relationship if not exists
                      ...(hasChildRel
                        ? []
                        : [createRelationship(relatedPersonId, "parent")]),
                    ],
                  };
                }
                return p;
              });

              return [...updatedPeople, personWithRelationship];
            }

            return [...prev, personWithRelationship];
          }
        }

        return [...prev, person];
      });
    }
    setShowForm(false);
    setEditingPerson(undefined);
  };

  const getReverseRelationship = (
    type: RelationshipType
  ): RelationshipType | null => {
    const reverseMap: Record<RelationshipType, RelationshipType | null> = {
      parent: "child",
      child: "parent",
      spouse: "spouse",
      sibling: "sibling",
      grandparent: "grandchild",
      grandchild: "grandparent",
      uncle: "other",
      aunt: "other",
      cousin: "cousin",
      other: "other",
    };
    return reverseMap[type] || null;
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setShowForm(true);
  };

  const handleAddRelatedPerson = (
    person: Person,
    relationshipType: RelationshipType
  ) => {
    // Set up form to add new person with relationship
    setEditingPerson(undefined);
    setShowForm(true);

    // Store the relationship info to auto-fill in form
    // We'll need to modify PersonForm to accept initial relationship
    setTimeout(() => {
      // Use a ref or state to pass this to the form
      // For now, we'll handle it in the form submission
      (window as any).pendingRelationship = {
        personId: person.id,
        type: relationshipType,
      };
    }, 0);
  };

  const handleDeletePerson = (personId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa người này?")) {
      // Remove person and all relationships pointing to them
      setPeople((prev) => {
        const filtered = prev.filter((p) => p.id !== personId);
        return filtered.map((p) => ({
          ...p,
          relationships: p.relationships.filter((r) => r.personId !== personId),
        }));
      });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPerson(undefined);
  };

  const handleAddRelationship = () => {
    if (people.length < 2) {
      alert("Cần ít nhất 2 người để tạo mối quan hệ");
      return;
    }
    setShowRelationshipForm(true);
  };

  const handleSaveRelationship = (
    person1Id: string,
    person2Id: string,
    relationshipType: RelationshipType
  ) => {
    const reverseType = getReverseRelationship(relationshipType);

    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === person1Id) {
          // Add relationship to person1
          return {
            ...p,
            relationships: [
              ...p.relationships,
              {
                id: uuidv4(),
                personId: person2Id,
                type: relationshipType,
              },
            ],
          };
        } else if (p.id === person2Id && reverseType) {
          // Add reverse relationship to person2
          return {
            ...p,
            relationships: [
              ...p.relationships,
              {
                id: uuidv4(),
                personId: person1Id,
                type: reverseType,
              },
            ],
          };
        }
        return p;
      })
    );

    setShowRelationshipForm(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🌳 Cây Gia Phả
          </h1>
          <p className="text-gray-600">
            Quản lý và xem cây gia phả gia đình của bạn
          </p>
        </header>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => {
              setEditingPerson(undefined);
              setShowForm(true);
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl font-medium flex items-center gap-2"
          >
            <span>+</span>
            <span>Thêm người mới</span>
          </button>

          {people.length >= 2 && (
            <button
              onClick={handleAddRelationship}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl font-medium flex items-center gap-2"
            >
              <span>🔗</span>
              <span>Kết nối mối quan hệ</span>
            </button>
          )}
        </div>

        {/* Person Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="relative">
              <button
                onClick={handleCancelForm}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold"
              >
                ×
              </button>
              <PersonForm
                person={editingPerson}
                existingPeople={people}
                onSave={handleSavePerson}
                onCancel={handleCancelForm}
              />
            </div>
          </div>
        )}

        {/* Relationship Form Modal */}
        {showRelationshipForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="relative">
              <button
                onClick={() => setShowRelationshipForm(false)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold"
              >
                ×
              </button>
              <RelationshipForm
                people={people}
                onSave={handleSaveRelationship}
                onCancel={() => setShowRelationshipForm(false)}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {people.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  {people.length}
                </p>
                <p className="text-sm text-gray-600">Tổng số người</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-600">
                  {people.filter((p) => p.gender === "male").length}
                </p>
                <p className="text-sm text-gray-600">Nam</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {people.filter((p) => p.gender === "female").length}
                </p>
                <p className="text-sm text-gray-600">Nữ</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {people.reduce((acc, p) => acc + p.relationships.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Mối quan hệ</p>
              </div>
            </div>
          </div>
        )}

        {/* Family Tree Flow */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Sơ đồ cây gia phả
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>💡 Hướng dẫn:</strong> Hover vào node để thêm người mới
            (Con, Vợ/Chồng, Cha/Mẹ). Click vào node để chỉnh sửa. Kéo để di
            chuyển các node.
            <strong>
              Các đường nối sẽ tự động hiện khi bạn tạo mối quan hệ!
            </strong>{" "}
            Xem chú thích ở góc phải trên để biết ý nghĩa các màu sắc.
          </p>
          <FamilyTreeFlow
            people={people}
            onNodeClick={handleEditPerson}
            onAddRelatedPerson={handleAddRelatedPerson}
          />
        </div>

        {/* People List */}
        {people.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Danh sách thành viên
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {people.map((person) => (
                <div key={person.id} className="relative">
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      person.gender === "male"
                        ? "bg-blue-100 border-blue-300"
                        : person.gender === "female"
                        ? "bg-pink-100 border-pink-300"
                        : "bg-purple-100 border-purple-300"
                    } shadow-md hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {person.image ? (
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <img
                            src={person.image}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                            person.gender === "male"
                              ? "bg-blue-100"
                              : person.gender === "female"
                              ? "bg-pink-100"
                              : "bg-purple-100"
                          }`}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">
                          {person.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {person.gender === "male"
                            ? "♂ Nam"
                            : person.gender === "female"
                            ? "♀ Nữ"
                            : "⚧ Khác"}
                        </p>
                      </div>
                    </div>
                    {person.relationships.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-medium">Mối quan hệ:</p>
                        <ul className="list-disc list-inside ml-2">
                          {person.relationships.map((rel) => {
                            const relatedPerson = people.find(
                              (p) => p.id === rel.personId
                            );
                            if (!relatedPerson) return null;
                            const labels: Record<RelationshipType, string> = {
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
                            return (
                              <li key={rel.id}>
                                {labels[rel.type] || rel.label}:{" "}
                                {relatedPerson.name}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEditPerson(person)}
                        className="flex-1 px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-medium"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
