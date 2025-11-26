export type Gender = 'male' | 'female' | 'other';

export type RelationshipType = 
  | 'parent' 
  | 'child' 
  | 'spouse' 
  | 'sibling' 
  | 'grandparent'
  | 'grandchild'
  | 'uncle'
  | 'aunt'
  | 'cousin'
  | 'other';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  image?: string;
  relationships: Relationship[];
}

export interface Relationship {
  id: string;
  personId: string;
  type: RelationshipType;
  label?: string;
}

export interface FamilyTreeData {
  people: Person[];
}


