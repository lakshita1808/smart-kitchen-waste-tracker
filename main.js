const API = '';

// Common fetch
async function apiFetch(url, options = {}) {
    const res = await fetch(API + url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    return res;
}

// Check Auth using backend session
async function checkAuth() {
    const res = await apiFetch('/api/me');
    if (!res.ok) {
        window.location.href = '/index.html';
        return null;
    }
    return await res.json();
}

// Set user info
function setUserInfo(user) {
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
}

// Logout
async function logout() {
    await apiFetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
}

// ================= LOGIN =================
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const res = await apiFetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                window.location.href = '/dashboard.html';
            } else {
                document.getElementById('errorMsg').textContent = data.message || 'Login failed';
                document.getElementById('errorMsg').style.display = 'block';
            }
        });
    }
}

// ================= REGISTER =================
if (window.location.pathname.includes('register.html')) {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;
            const role = document.getElementById('role').value;

            if (password !== confirm) {
                document.getElementById('errorMsg').textContent = 'Passwords do not match!';
                document.getElementById('errorMsg').style.display = 'block';
                return;
            }

            const res = await apiFetch('/api/register', {
                method: 'POST',
                body: JSON.stringify({ name, username, password, role })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Account created! Please login.');
                window.location.href = '/index.html';
            } else {
                document.getElementById('errorMsg').textContent = data.message || 'Registration failed';
                document.getElementById('errorMsg').style.display = 'block';
            }
        });
    }
}

// ================= ADD RECORD =================
if (window.location.pathname.includes('add-record.html')) {
    (async () => {
        const user = await checkAuth();
        if (!user) return;
        setUserInfo(user);

        if (user.role === 'admin') {
            const link = document.getElementById('analyticsLink');
            if (link) link.style.display = 'flex';
        }
    })();

    document.getElementById('wasteForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            date: document.getElementById('date').value,
            day: document.getElementById('day').value,
            food_item: document.getElementById('foodItem').value,
            quantity_kg: parseFloat(document.getElementById('quantity').value)
        };

        const res = await apiFetch('/api/waste', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            document.getElementById('successMsg').textContent = 'Record saved!';
            document.getElementById('successMsg').style.display = 'block';
            document.getElementById('foodItem').value = '';
document.getElementById('quantity').value = '';
        } else {
            document.getElementById('errorMsg').textContent = result.message;
            document.getElementById('errorMsg').style.display = 'block';
        }
    });
}

// ================= RECORDS =================
if (window.location.pathname.includes('records.html')) {
    (async () => {
        const user = await checkAuth();
        if (!user) return;
        setUserInfo(user);

        if (user.role === 'admin') {
            document.getElementById('analyticsLink').style.display = 'flex';
        }

        const res = await apiFetch('/api/waste');
        const records = await res.json();

        const tbody = document.getElementById('recordsTable');
        tbody.innerHTML = '';

        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${r.day}</td>
                <td>${r.food_item}</td>
                <td>${parseFloat(r.quantity_kg).toFixed(2)} kg</td>
                ${user.role === 'admin' ? `<td>${r.added_by_username}</td>` : ''}
                ${user.role === 'admin' ? `<td><button class="btn btn-danger" onclick="deleteRecord(${r.id})">🗑️ Delete</button></td>` : ''}
            
                `;
            tbody.appendChild(tr);
        });

        window.deleteRecord = async (id) => {
            await apiFetch('/api/waste/' + id, { method: 'DELETE' });
            window.location.reload();
        };
    })();
}

// ================= ANALYTICS =================
if (window.location.pathname.includes('analytics.html')) {
    (async () => {
        const user = await checkAuth();
        if (!user) return;
        setUserInfo(user);

        const res = await apiFetch('/api/waste');
        const records = await res.json();

        const itemMap = {}, dayMap = {};

        records.forEach(r => {
            itemMap[r.food_item] = (itemMap[r.food_item] || 0) + parseFloat(r.quantity_kg);
            dayMap[r.day] = (dayMap[r.day] || 0) + parseFloat(r.quantity_kg);
        });

        new Chart(document.getElementById('itemChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(itemMap),
                datasets: [{ label: 'Waste (kg)', data: Object.values(itemMap) }]
            }
        });

        new Chart(document.getElementById('dayChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(dayMap),
                datasets: [{ label: 'Waste (kg)', data: Object.values(dayMap) }]
            }
        });
    })();
}