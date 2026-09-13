<template>
  <div class="users-page">
    <main class="users-main">
      <section class="card">
        <h2>System Users</h2>
        <p class="card-desc">Manage administrators and operators for your snapsync.</p>
        <div class="settings-box">
          <div v-for="user in users" :key="user.id" class="field-row" :class="{ disabled: user.is_disabled }">
            <div class="user-info">
              <h3 class="user-email">
                <span v-if="user.name" class="user-name">{{ user.name }}</span>
                <span v-if="user.name" class="user-email-sub">({{ user.email }})</span>
                <span v-else>{{ user.email }}</span>
              </h3>
              <span v-if="user.is_disabled" class="disabled-badge">Disabled</span>
            </div>
            <div class="user-actions">
              <span class="user-role" :class="`role-${user.role}`">
                {{ user.role === 'admin' && user.is_superadmin ? 'super admin' : user.role }}
              </span>
              <button @click="openEditModal(user)" class="btn-icon" title="Edit User">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button v-if="user.email !== authStore.user?.email" @click="openDeleteModal(user.id)" class="btn-icon" title="Remove User">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
              <div v-else class="btn-icon-placeholder"></div>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <AppButton variant="primary" @click="openAddModal">Add User</AppButton>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
        <div class="modal-content">
          <h2>{{ isEditing ? 'Edit User' : 'Add New User' }}</h2>
          <div class="form-field">
            <label>Name</label>
            <input type="text" v-model="userForm.name" placeholder="John Doe" />
          </div>
          <div class="form-field">
            <label>Email</label>
            <input type="email" v-model="userForm.email" placeholder="operator@example.com" />
          </div>
          <div class="form-field">
            <label>{{ isEditing ? 'New Password (leave blank to keep current)' : 'Password' }}</label>
            <input type="password" v-model="userForm.password" />
          </div>
          <div class="form-field">
            <label>Role</label>
            <select v-model="userForm.role">
              <option v-if="authStore.user?.isSuperAdmin" value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
            </select>
          </div>
          <div v-if="userForm.role === 'superadmin' && userForm.email !== authStore.user?.email" class="warning-box">
            ⚠️ Warning: This will transfer your Super Admin privileges to this user. You will be demoted to a regular Admin, as there can only be one Super Admin.
          </div>
          <div class="form-field checkbox-field" v-if="isEditing && userForm.email !== authStore.user?.email">
            <label>
              <input type="checkbox" v-model="userForm.isDisabled" />
              Disable Account
            </label>
          </div>
          
          <div class="form-field auth-field" v-if="isEditing">
            <label>Admin Password (Required to save changes)</label>
            <input type="password" v-model="userForm.adminPassword" placeholder="Your password" />
          </div>

          <div class="modal-actions">
            <AppButton variant="secondary" @click="showUserModal = false">Cancel</AppButton>
            <AppButton variant="primary" @click="saveUser" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save' }}
            </AppButton>
          </div>
        </div>
      </div>
      
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-content">
          <h2>Confirm Deletion</h2>
          <p style="margin-bottom: 1rem; color: var(--color-text-sub); font-size: var(--text-sm);">Please enter your admin password to confirm deleting this user.</p>
          <div class="form-field">
            <label>Admin Password</label>
            <input type="password" v-model="deleteAdminPassword" placeholder="Your password" />
          </div>
          <div class="modal-actions">
            <AppButton variant="secondary" @click="showDeleteModal = false">Cancel</AppButton>
            <AppButton variant="primary" @click="deleteUser" :disabled="loading" style="background: var(--color-error); color: white;">
              {{ loading ? 'Deleting...' : 'Delete' }}
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { toast } from 'vue3-toastify'
import { useAuthStore } from '../stores/auth'
import AppButton from '../components/ui/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const users = ref<any[]>([])
const showUserModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingUserId = ref('')
const loading = ref(false)
const deleteAdminPassword = ref('')
const userToDelete = ref('')

const userForm = ref({ email: '', password: '', role: 'operator', name: '', isDisabled: false, adminPassword: '' })

async function fetchUsers() {
  try {
    const { data } = await axios.get('/api/admin/users')
    users.value = data.users
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to fetch users')
  }
}

function openAddModal() {
  isEditing.value = false
  userForm.value = { email: '', password: '', role: 'operator', name: '', isDisabled: false, adminPassword: '' }
  showUserModal.value = true
}

function openEditModal(user: any) {
  isEditing.value = true
  editingUserId.value = user.id
  userForm.value = { 
    email: user.email, 
    password: '', 
    role: user.is_superadmin ? 'superadmin' : user.role, 
    name: user.name || '', 
    isDisabled: user.is_disabled === 1, 
    adminPassword: '' 
  }
  showUserModal.value = true
}

function openDeleteModal(id: string) {
  userToDelete.value = id
  deleteAdminPassword.value = ''
  showDeleteModal.value = true
}

async function saveUser() {
  if (!userForm.value.name) {
    toast.error('Name is required')
    return
  }
  if (!userForm.value.email) return
  if (!isEditing.value && !userForm.value.password) return
  if (isEditing.value && !userForm.value.adminPassword) {
    toast.error('Admin password is required to save changes')
    return
  }
  
  loading.value = true
  try {
    if (isEditing.value) {
      await axios.put(`/api/admin/users/${editingUserId.value}`, userForm.value)
      toast.success('User updated successfully')
    } else {
      await axios.post('/api/admin/users', userForm.value)
      toast.success('User added successfully')
    }
    showUserModal.value = false
    await fetchUsers()
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save user')
  } finally {
    loading.value = false
  }
}

async function deleteUser() {
  if (!deleteAdminPassword.value) {
    toast.error('Admin password is required')
    return
  }
  
  loading.value = true
  try {
    await axios.delete(`/api/admin/users/${userToDelete.value}`, {
      data: { adminPassword: deleteAdminPassword.value }
    })
    toast.success('User deleted')
    showDeleteModal.value = false
    await fetchUsers()
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete user')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-page {
  background: var(--color-bg);
  color: var(--color-text);
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-left h1 {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0;
}
.btn-ghost {
  background: none;
  border: none;
  color: var(--color-text-sub);
  cursor: pointer;
  padding: 0.25rem;
}
.btn-ghost:hover {
  color: var(--color-text);
}
.users-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
}

.users-header h2 {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn-icon-placeholder {
  width: 32px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.user-email {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 500;
}
.user-name {
  font-weight: 600;
  margin-right: 0.5rem;
}
.user-email-sub {
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  font-weight: 400;
}
.disabled-badge {
  font-size: var(--text-xs);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  margin-top: 0.25rem;
  width: max-content;
}
.field-row.disabled {
  opacity: 0.6;
}

.user-role {
  font-size: var(--text-xs);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-lg);
  background: var(--color-border);
  width: max-content;
}
.role-admin {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}
.role-operator {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}
.btn-primary {
  background: var(--color-text);
  color: var(--color-bg);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover {
  background: #e5e5e5;
}
.btn-sm {
  font-size: var(--text-sm);
  padding: 0.4rem 0.75rem;
}
.btn-secondary {
  background: var(--color-border);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-icon {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.1rem;
}
.btn-icon:hover {
  color: var(--color-error);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
}
.modal-content h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
}
.form-field {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-field label {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}
.form-field input, .form-field select {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
}
.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
.checkbox-field input {
  width: auto;
}
.warning-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  margin-bottom: 1rem;
}
.auth-field {
  border-top: 1px dashed var(--color-border);
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.card h2 {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0 0 0.25rem;
}
.card-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0 0 1.25rem;
}
.settings-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.field-row:last-child {
  border-bottom: none;
}
.field-row:nth-child(even) {
  background: var(--color-surface-alt);
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .field-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .user-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
