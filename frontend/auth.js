/* ============================================================
 * OBRA CLARA - SISTEMA DE AUTENTICACIÓN Y ROLES
 * ============================================================ */

const Auth = (() => {
  const USERS_KEY = 'obraClaraUsers';
  const SESSION_KEY = 'obraClaraSession';

  const defaultUsers = [
    {
      id: 'usr-admin',
      username: 'admin',
      name: 'Administrador Principal',
      password: 'admin',
      role: 'ADMINISTRADOR',
      email: 'admin@obraclara.com',
      active: true,
      createdAt: '2026-01-01'
    },
    {
      id: 'usr-user',
      username: 'usuario',
      name: 'Operador de Obra',
      password: '123',
      role: 'USUARIO COMÚN',
      email: 'operador@obraclara.com',
      active: true,
      createdAt: '2026-01-01'
    }
  ];

  function initUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  function getUsers() {
    initUsers();
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  function setSession(user) {
    const sessionData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  }

  function login(username, password) {
    initUsers();
    const users = getUsers();
    const u = username.trim().toLowerCase();
    const found = users.find(user =>
      (user.username.toLowerCase() === u || (user.email && user.email.toLowerCase() === u)) &&
      user.password === password
    );

    if (!found) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    if (!found.active) {
      throw new Error('Este usuario se encuentra inactivo. Contacte al administrador.');
    }

    return setSession(found);
  }

  function logout(depth = 0) {
    localStorage.removeItem(SESSION_KEY);
    const prefix = depth === 0 ? '' : '../';
    window.location.href = `${prefix}login/index.html`;
  }

  function requireAuth(depth = 0) {
    const session = getSession();
    const prefix = depth === 0 ? '' : '../';
    if (!session) {
      window.location.href = `${prefix}login/index.html`;
      return null;
    }
    return session;
  }

  function requireAdmin(depth = 0) {
    const session = requireAuth(depth);
    if (!session) return null;

    const prefix = depth === 0 ? '' : '../';
    if (session.role !== 'ADMINISTRADOR') {
      alert('Acceso restringido: Esta sección requiere permisos de ADMINISTRADOR.');
      window.location.href = `${prefix}index.html`;
      return null;
    }
    return session;
  }

  function renderTopbar(depth = 0) {
    const session = getSession();
    if (!session) return;

    const topbarMeta = document.querySelector('.topbar-meta');
    if (!topbarMeta) return;

    const isAdmin = session.role === 'ADMINISTRADOR';
    const badgeClass = isAdmin ? 'role-admin' : 'role-user';

    topbarMeta.innerHTML = `
      <div class="topbar-user-widget">
        <span>👤 <strong>${session.name}</strong></span>
        <span class="user-badge ${badgeClass}">${session.role}</span>
        <button class="btn-logout" type="button" id="btn-session-logout" title="Cerrar sesión activa">Cerrar sesión ⎋</button>
      </div>
    `;

    document.querySelector('#btn-session-logout')?.addEventListener('click', () => logout(depth));
  }

  return {
    getUsers,
    saveUsers,
    getSession,
    login,
    logout,
    requireAuth,
    requireAdmin,
    renderTopbar
  };
})();
