'use client';

import { useState } from 'react';
import { Person, RelationshipType } from '@/types/family';
import { v4 as uuidv4 } from 'uuid';

interface RelationshipFormProps {
  people: Person[];
  onSave: (person1Id: string, person2Id: string, relationshipType: RelationshipType) => void;
  onCancel: () => void;
}

export default function RelationshipForm({ people, onSave, onCancel }: RelationshipFormProps) {
  const [person1Id, setPerson1Id] = useState<string>('');
  const [person2Id, setPerson2Id] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('sibling');

  const relationshipLabels: Record<RelationshipType, string> = {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!person1Id || !person2Id) {
      alert('Vui lòng chọn cả hai người');
      return;
    }

    if (person1Id === person2Id) {
      alert('Không thể tạo mối quan hệ với chính mình');
      return;
    }

    // Check if relationship already exists
    const person1 = people.find(p => p.id === person1Id);
    if (person1?.relationships.some(r => r.personId === person2Id)) {
      alert('Mối quan hệ này đã tồn tại');
      return;
    }

    onSave(person1Id, person2Id, relationshipType);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Kết nối mối quan hệ
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Người thứ nhất *
          </label>
          <select
            value={person1Id}
            onChange={(e) => setPerson1Id(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Chọn người</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mối quan hệ *
          </label>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Object.entries(relationshipLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Người thứ hai *
          </label>
          <select
            value={person2Id}
            onChange={(e) => setPerson2Id(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Chọn người</option>
            {people
              .filter(p => p.id !== person1Id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
        >
          Kết nối
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}


