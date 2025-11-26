'use client';

import { useMemo } from 'react';
import { Person } from '@/types/family';
import PersonCard from './PersonCard';

interface FamilyTreeProps {
  people: Person[];
  onEditPerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
}

export default function FamilyTree({ people, onEditPerson, onDeletePerson }: FamilyTreeProps) {
  const groupedByRelationships = useMemo(() => {
    const groups: { [key: string]: Person[] } = {};
    const processed = new Set<string>();

    people.forEach((person) => {
      if (processed.has(person.id)) return;

      // Find all related people
      const relatedIds = new Set<string>([person.id]);
      const queue = [person.id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentPerson = people.find(p => p.id === currentId);
        
        if (currentPerson) {
          currentPerson.relationships.forEach(rel => {
            if (!relatedIds.has(rel.personId)) {
              relatedIds.add(rel.personId);
              queue.push(rel.personId);
            }
          });
        }
      }

      // Create group key
      const groupKey = Array.from(relatedIds).sort().join('-');
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      relatedIds.forEach(id => {
        const p = people.find(pp => pp.id === id);
        if (p && !groups[groupKey].includes(p)) {
          groups[groupKey].push(p);
          processed.add(id);
        }
      });
    });

    // Add isolated people
    people.forEach(person => {
      if (!processed.has(person.id)) {
        const key = person.id;
        groups[key] = [person];
      }
    });

    return Object.values(groups);
  }, [people]);

  const getRelationshipLabel = (person: Person, relatedPerson: Person): string => {
    const relationship = person.relationships.find(r => r.personId === relatedPerson.id);
    if (!relationship) return '';

    const labels: { [key: string]: string } = {
      parent: 'Cha/Mẹ',
      child: 'Con',
      spouse: 'Vợ/Chồng',
      sibling: 'Anh/Chị/Em',
      grandparent: 'Ông/Bà',
      grandchild: 'Cháu',
      uncle: 'Chú/Bác/Cậu',
      aunt: 'Cô/Dì',
      cousin: 'Anh/Chị/Em họ',
      other: 'Khác',
    };

    return labels[relationship.type] || relationship.label || '';
  };

  return (
    <div className="space-y-8">
      {groupedByRelationships.map((group, groupIndex) => (
        <div key={groupIndex} className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            Nhóm gia đình {groupIndex + 1}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.map((person) => (
              <div key={person.id} className="relative">
                <PersonCard
                  person={person}
                  onEdit={onEditPerson}
                  onDelete={onDeletePerson}
                />
                
                {/* Show relationships */}
                {person.relationships.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {person.relationships.map((rel) => {
                      const relatedPerson = people.find(p => p.id === rel.personId);
                      if (!relatedPerson) return null;
                      
                      return (
                        <div
                          key={rel.id}
                          className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center gap-1"
                        >
                          <span className="font-medium">{getRelationshipLabel(person, relatedPerson)}:</span>
                          <span>{relatedPerson.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Visual connections */}
          {group.length > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Sơ đồ mối quan hệ:</h4>
              <div className="flex flex-wrap gap-2">
                {group.map((person, idx) => (
                  <div key={person.id} className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-md text-sm font-medium">
                      {person.name}
                    </span>
                    {idx < group.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {people.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-lg">
          <p className="text-gray-500 text-lg">Chưa có người nào trong cây gia phả</p>
          <p className="text-gray-400 text-sm mt-2">Hãy thêm người đầu tiên để bắt đầu!</p>
        </div>
      )}
    </div>
  );
}


