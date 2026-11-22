export function AdminAccountBadge({ active }) {
  return <span className="cook-badge" data-state={active ? 'ACTIVA' : 'BAJA'}>{active ? 'Activa' : 'Desactivada'}</span>
}

export function AdminRoleBadges({ roles }) {
  return roles.length > 0 ? (
    <ul className="admin-badges" role="list" aria-label="Roles asignados">
      {roles.map((role) => <li className="cook-badge" data-state="ROL" key={role}>{role}</li>)}
    </ul>
  ) : 'Sin roles asignados'
}
