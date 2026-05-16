import { UserRole, Department, ComplaintCategory } from "@prisma/client";

/**
 * Permissions et regles d'acces par role.
 */

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface UserContext {
  id: string;
  role: UserRole;
  department?: Department | null;
}

interface ComplaintContext {
  category: ComplaintCategory;
  assignedToId?: string | null;
  roomId?: string;
}

interface EmployeeProfileContext {
  userId: string;
  department: Department;
}

// -----------------------------------------------------------
// Mapping categorie -> departement
// -----------------------------------------------------------

const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, Department | null> = {
  MAINTENANCE: Department.MAINTENANCE,
  HOUSEKEEPING: Department.HOUSEKEEPING,
  RECEPTION: Department.RECEPTION,
  RESTAURANT: Department.RESTAURANT,
  COMPLAINT: null,
  OTHER: null,
};

/**
 * Determiner le departement responsable d'une categorie de reclamation.
 */
export const getDepartmentForCategory = (category: ComplaintCategory): Department | null => {
  return CATEGORY_TO_DEPARTMENT[category] ?? null;
};

// -----------------------------------------------------------
// Helpers de permission
// -----------------------------------------------------------

/**
 * Verifier si un utilisateur peut voir une reclamation.
 *
 * - ADMIN : tout
 * - RECEPTIONIST : tout
 * - MAINTENANCE_MANAGER : reclamations MAINTENANCE
 * - HOUSEKEEPING_MANAGER : reclamations HOUSEKEEPING
 * - EMPLOYEE : uniquement ses taches assignees
 */
export const canViewComplaint = (user: UserContext, complaint: ComplaintContext): boolean => {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.RECEPTIONIST:
      return true;

    case UserRole.MAINTENANCE_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.MAINTENANCE;

    case UserRole.HOUSEKEEPING_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.HOUSEKEEPING;

    case UserRole.EMPLOYEE:
      return complaint.assignedToId === user.id;

    default:
      return false;
  }
};

/**
 * Verifier si un utilisateur peut assigner une reclamation.
 *
 * - ADMIN : tout
 * - RECEPTIONIST : tout
 * - MAINTENANCE_MANAGER : reclamations MAINTENANCE uniquement
 * - HOUSEKEEPING_MANAGER : reclamations HOUSEKEEPING uniquement
 * - EMPLOYEE : jamais
 */
export const canAssignComplaint = (user: UserContext, complaint: ComplaintContext): boolean => {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.RECEPTIONIST:
      return true;

    case UserRole.MAINTENANCE_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.MAINTENANCE;

    case UserRole.HOUSEKEEPING_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.HOUSEKEEPING;

    default:
      return false;
  }
};

/**
 * Verifier si un manager peut gerer un employe.
 *
 * - ADMIN : tout
 * - MAINTENANCE_MANAGER : employes MAINTENANCE uniquement
 * - HOUSEKEEPING_MANAGER : employes HOUSEKEEPING uniquement
 * - Autres : jamais
 */
export const canManageEmployee = (manager: UserContext, employeeProfile: EmployeeProfileContext): boolean => {
  switch (manager.role) {
    case UserRole.ADMIN:
      return true;

    case UserRole.MAINTENANCE_MANAGER:
      return employeeProfile.department === Department.MAINTENANCE;

    case UserRole.HOUSEKEEPING_MANAGER:
      return employeeProfile.department === Department.HOUSEKEEPING;

    default:
      return false;
  }
};

/**
 * Verifier si un employe peut utiliser les routes mobiles pour une tache.
 *
 * - EMPLOYEE : uniquement ses taches assignees
 * - Managers et ADMIN : peuvent aussi acceder (pour supervision)
 */
export const canUseMobileTask = (user: UserContext, complaint: ComplaintContext): boolean => {
  switch (user.role) {
    case UserRole.ADMIN:
      return true;

    case UserRole.MAINTENANCE_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.MAINTENANCE;

    case UserRole.HOUSEKEEPING_MANAGER:
      return getDepartmentForCategory(complaint.category) === Department.HOUSEKEEPING;

    case UserRole.EMPLOYEE:
      return complaint.assignedToId === user.id;

    default:
      return false;
  }
};

/**
 * Obtenir les departements qu'un utilisateur peut superviser.
 */
export const getManagedDepartments = (user: UserContext): Department[] => {
  switch (user.role) {
    case UserRole.ADMIN:
      return Object.values(Department);

    case UserRole.RECEPTIONIST:
      return Object.values(Department);

    case UserRole.MAINTENANCE_MANAGER:
      return [Department.MAINTENANCE];

    case UserRole.HOUSEKEEPING_MANAGER:
      return [Department.HOUSEKEEPING];

    default:
      return [];
  }
};

/**
 * Obtenir les categories de reclamations qu'un utilisateur peut voir.
 */
export const getViewableCategories = (user: UserContext): ComplaintCategory[] => {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.RECEPTIONIST:
      return Object.values(ComplaintCategory);

    case UserRole.MAINTENANCE_MANAGER:
      return [ComplaintCategory.MAINTENANCE];

    case UserRole.HOUSEKEEPING_MANAGER:
      return [ComplaintCategory.HOUSEKEEPING];

    default:
      return [];
  }
};
