'use client';

import { useState, useEffect } from 'react';
import { Person, Gender, RelationshipType } from '@/types/family';
import { v4 as uuidv4 } from 'uuid';

interface PersonFormProps {
  person?: Person;
  existingPeople: Person[];
  onSave: (person: Person, relatedPersonId?: string, relationshipType?: RelationshipType, autoAddSpouse?: boolean) => void;
  onCancel: () => void;
}

export default function PersonForm({ person, existingPeople, onSave, onCancel }: PersonFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [image, setImage] = useState<string>('');
  const [relationshipPersonId, setRelationshipPersonId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('child');
  const [showRelationship, setShowRelationship] = useState(false);
  const [parent2Id, setParent2Id] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (person) {
      setName(person.name);
      setGender(person.gender);
      setImage(person.image || '');
      setShowRelationship(false);
    } else {
      // Check if there's a pending relationship from node click
      const pending = (window as any).pendingRelationship;
      if (pending) {
        setRelationshipPersonId(pending.personId);
        setRelationshipType(pending.type);
        setShowRelationship(true);
        delete (window as any).pendingRelationship;
      }
    }
  }, [person]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate: Nếu thêm cha/mẹ thì phải có cả cha và mẹ (vì thằng mới tạo là cha/mẹ, thằng đã chọn là con)
    if (showRelationship && relationshipType === 'parent' && relationshipPersonId) {
      const selectedChild = existingPeople.find(p => p.id === relationshipPersonId);
      // Kiểm tra xem con đã có cha/mẹ khác chưa
      const hasOtherParent = selectedChild?.relationships.some(r => r.type === 'parent');
      
      if (!hasOtherParent && !parent2Id) {
        setErrors({
          parent2: 'Khi thêm cha/mẹ, cần chọn cả cha và mẹ. Nếu con đã có 1 cha/mẹ, hệ thống sẽ tự động thêm. Nếu chưa có, vui lòng chọn người thứ 2.'
        });
        return;
      }
    }
    
    const newPerson: Person = {
      id: person?.id || uuidv4(),
      name,
      gender,
      image: image || undefined,
      relationships: person?.relationships || [],
    };

    // Pass relationship info to parent to handle bidirectional update
    if (showRelationship && relationshipPersonId && relationshipType) {
      const autoAddSpouse = relationshipType === 'parent'; // Chỉ auto-add khi thêm cha/mẹ
      // Nếu có parent2Id, cần xử lý đặc biệt
      if (relationshipType === 'parent' && parent2Id) {
        // Sẽ xử lý trong parent component
        onSave(newPerson, relationshipPersonId, relationshipType, autoAddSpouse);
        // Lưu parent2Id vào window để parent component xử lý
        (window as any).pendingParent2Id = parent2Id;
      } else {
        onSave(newPerson, relationshipPersonId, relationshipType, autoAddSpouse);
      }
    } else {
      onSave(newPerson);
    }
  };

  const getReverseRelationship = (type: RelationshipType): RelationshipType | null => {
    const reverseMap: Record<RelationshipType, RelationshipType | null> = {
      parent: 'child',
      child: 'parent',
      spouse: 'spouse',
      sibling: 'sibling',
      grandparent: 'grandchild',
      grandchild: 'grandparent',
      uncle: 'other',
      aunt: 'other',
      cousin: 'cousin',
      other: 'other',
    };
    return reverseMap[type] || null;
  };

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

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {person ? 'Sửa thông tin' : 'Thêm người mới'}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Nhập tên"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giới tính *
          </label>
          <div className="flex gap-3">
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={g}
                  checked={gender === g}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">
                  {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ảnh đại diện
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
          {image && (
            <div className="mt-2 relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {!person && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRelationship}
                onChange={(e) => setShowRelationship(e.target.checked)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Kết nối với người có sẵn
              </span>
            </label>

            {showRelationship && existingPeople.length > 0 && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {relationshipType === 'parent' ? 'Con *' : relationshipType === 'child' ? 'Cha/Mẹ *' : 'Người liên quan *'}
                  </label>
                  <select
                    value={relationshipPersonId}
                    onChange={(e) => {
                      setRelationshipPersonId(e.target.value);
                      setParent2Id(''); // Reset parent 2 khi đổi
                      setErrors({});
                    }}
                    required={showRelationship}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.parent2 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Chọn người</option>
                    {existingPeople.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {relationshipType === 'child' && relationshipPersonId && (
                    <div className="mt-2 space-y-2">
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          ℹ️ Thông tin quan hệ
                        </p>
                        <p className="text-xs text-blue-700">
                          Bạn đang thêm <strong>con</strong>. Người đã chọn sẽ là <strong>cha/mẹ</strong> của người mới.
                        </p>
                        {(() => {
                          const selectedParent = existingPeople.find(p => p.id === relationshipPersonId);
                          const spouseRel = selectedParent?.relationships.find(r => r.type === 'spouse');
                          const hasSpouse = !!spouseRel;
                          
                          if (hasSpouse) {
                            const spouse = existingPeople.find(p => p.id === spouseRel!.personId);
                            return (
                              <div className="mt-2 pt-2 border-t border-blue-200">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Tự động: Người mới sẽ có quan hệ với cả <strong>{selectedParent?.name}</strong> và <strong>{spouse?.name}</strong> (vợ/chồng)
                                </p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <p className="text-xs text-amber-700">
                                ⚠️ Người đã chọn chưa có vợ/chồng. Người mới chỉ có quan hệ với 1 người.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {relationshipType === 'parent' && relationshipPersonId && (
                  <div>
                    <div className="mb-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm font-medium text-purple-800 mb-1">
                        ℹ️ Thông tin quan hệ
                      </p>
                      <p className="text-xs text-purple-700">
                        Bạn đang thêm <strong>cha/mẹ</strong>. Người đã chọn sẽ là <strong>con</strong> của người mới.
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        ⚠️ <strong>Bắt buộc:</strong> Cần chọn cả cha và mẹ để tạo quan hệ đầy đủ.
                      </p>
                    </div>
                    
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cha/Mẹ thứ hai {(() => {
                        const selectedChild = existingPeople.find(p => p.id === relationshipPersonId);
                        const hasOtherParent = selectedChild?.relationships.some(r => r.type === 'parent');
                        return hasOtherParent ? '(tự động - đã có cha/mẹ khác)' : '* Bắt buộc';
                      })()}
                    </label>
                    {(() => {
                      const selectedChild = existingPeople.find(p => p.id === relationshipPersonId);
                      const otherParentRel = selectedChild?.relationships.find(r => r.type === 'parent');
                      const hasOtherParent = !!otherParentRel;
                      
                      if (hasOtherParent) {
                        const otherParent = existingPeople.find(p => p.id === otherParentRel!.personId);
                        return (
                          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-medium text-green-800 mb-1">
                              ✓ Tự động phát hiện
                            </p>
                            <p className="text-xs text-green-700">
                              {selectedChild?.name} đã có cha/mẹ là <strong>{otherParent?.name}</strong>.
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Người mới và {otherParent?.name} sẽ tự động có quan hệ vợ/chồng.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          <select
                            value={parent2Id}
                            onChange={(e) => {
                              setParent2Id(e.target.value);
                              setErrors({});
                            }}
                            required
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              errors.parent2 ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Chọn cha/mẹ thứ 2</option>
                            {existingPeople
                              .filter(p => p.id !== relationshipPersonId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                          {errors.parent2 && (
                            <p className="mt-1 text-sm text-red-600">{errors.parent2}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            💡 Người mới và người thứ 2 sẽ tự động có quan hệ vợ/chồng.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mối quan hệ
                  </label>
                  <select
                    value={relationshipType}
                    onChange={(e) => {
                      setRelationshipType(e.target.value as RelationshipType);
                      setParent2Id('');
                      setErrors({});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(relationshipLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
        >
          {person ? 'Cập nhật' : 'Thêm'}
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

