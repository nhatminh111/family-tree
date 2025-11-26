'use client';

import { Person, Gender } from '@/types/family';

interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
}

export default function PersonCard({ person, onEdit, onDelete }: PersonCardProps) {
  const genderColors = {
    male: 'bg-blue-100 border-blue-300',
    female: 'bg-pink-100 border-pink-300',
    other: 'bg-purple-100 border-purple-300',
  };

  const genderIcons = {
    male: '♂',
    female: '♀',
    other: '⚧',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${genderColors[person.gender]} shadow-md hover:shadow-lg transition-shadow`}>
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
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${genderColors[person.gender]}`}>
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">{person.name}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <span>{genderIcons[person.gender]}</span>
            <span className="capitalize">
              {person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Khác'}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit(person)}
          className="flex-1 px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          Sửa
        </button>
        <button
          onClick={() => onDelete(person.id)}
          className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

