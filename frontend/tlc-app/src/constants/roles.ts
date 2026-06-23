export interface RoleDefinition {
  id: number;
  name: string;
  label: string;
}

export const ROLES: RoleDefinition[] = [
  { id: 1, name: 'CEO',                label: 'CEO'               },
  { id: 2, name: 'SustainabilityLead', label: 'Sustainability Lead'},
  { id: 3, name: 'TechMETeam',         label: 'Tech & ME Team'    },
  { id: 4, name: 'TLCManager',         label: 'TLC Manager'       },
];

export const getRoleById   = (id: number)     => ROLES.find((r) => r.id   === id);
export const getRoleByName = (name: string)   => ROLES.find((r) => r.name === name);
