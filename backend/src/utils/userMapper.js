/** Map Prisma User (camelCase) to API shape (snake_case) for frontend compatibility */
function toApiUser(user, extras = {}) {
    if (!user) return null;
    return {
        id: user.id,
        employee_id: user.employeeId,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        department_id: user.departmentId,
        shift_id: user.shiftId,
        manager_id: user.managerId,
        date_of_joining: user.dateOfJoining,
        face_registered_at: user.faceRegisteredAt,
        last_login: user.lastLogin,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        department_name: user.department?.name ?? extras.department_name ?? null,
        shift_name: user.shift?.name ?? extras.shift_name ?? null,
        manager_name: user.manager
            ? `${user.manager.firstName} ${user.manager.lastName}`
            : extras.manager_name ?? null,
        full_name: `${user.firstName} ${user.lastName}`,
        face_registered: !!user.faceRegisteredAt,
        ...extras
    };
}

function toAuthUser(user) {
    const api = toApiUser(user);
    return {
        id: api.id,
        employee_id: api.employee_id,
        email: api.email,
        first_name: api.first_name,
        last_name: api.last_name,
        full_name: api.full_name,
        role: api.role,
        department: user.department?.name || null,
        department_id: api.department_id,
        shift: user.shift?.name || null,
        shift_id: api.shift_id,
        face_registered: api.face_registered
    };
}

module.exports = { toApiUser, toAuthUser };
