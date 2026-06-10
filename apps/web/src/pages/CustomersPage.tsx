import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';
import { toast } from '../components/Toast';
import { CustomerCRMView } from '../components/CustomerCRMView';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { appointments: number };
}

interface NewCustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const BLANK_FORM: NewCustomerForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: 'LA', zip: '',
};

export function CustomersPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewCustomerForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) {
      if (!q.trim()) loadAll();
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.searchCustomers(q.trim());
        setCustomers(results);
      } catch {
        // fall back to local filter
      }
    }, 300);
  };

  const filtered = query.trim().length > 0 && query.trim().length < 2
    ? customers.filter(c =>
        `${c.firstName} ${c.lastName} ${c.email || ''} ${c.phone || ''} ${c.address || ''}`
          .toLowerCase().includes(query.toLowerCase())
      )
    : customers;

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      const customer = await api.createCustomer(form);
      toast.success(`${customer.firstName} ${customer.lastName} added`);
      setShowForm(false);
      setForm(BLANK_FORM);
      loadAll();
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        toast.error('A customer with this email or phone already exists');
      } else {
        toast.error(err.message || 'Failed to create customer');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNewAppointment = async (customerId: string) => {
    if (!user?.id) { toast.error('Not logged in'); return; }
    try {
      const appt = await api.createAppointment({ customerId, userId: user.id });
      navigate(`/appointments/${appt.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create appointment');
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>👤 Customers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            {loading ? 'Loading…' : `${filtered.length} customer${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setSelectedCustomer(null); }}>
          + New Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', color: 'var(--text-muted)' }}>🔍</span>
        <input
          id="customer-search"
          type="search"
          placeholder="Search by name, phone, email, address…"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.9rem',
            outline: 'none', boxSizing: 'border-box',
          }}
          autoComplete="off"
        />
      </div>

      {/* New customer form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '1.25rem', marginBottom: '1.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>New Customer</h2>
            <button onClick={() => { setShowForm(false); setForm(BLANK_FORM); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {([
              { key: 'firstName', label: 'First Name *', type: 'text' },
              { key: 'lastName', label: 'Last Name *', type: 'text' },
              { key: 'phone', label: 'Phone', type: 'tel' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'address', label: 'Street Address', type: 'text' },
              { key: 'city', label: 'City', type: 'text' },
              { key: 'state', label: 'State', type: 'text' },
              { key: 'zip', label: 'ZIP', type: 'text' },
            ] as { key: keyof NewCustomerForm; label: string; type: string }[]).map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                <input
                  id={`new-customer-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  style={{
                    width: '100%', marginTop: '0.25rem', padding: '0.5rem 0.75rem',
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setForm(BLANK_FORM); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving…' : 'Create Customer'}
            </button>
          </div>
        </div>
      )}

      {/* Customer list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite', opacity: 0.6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {query ? 'No customers match your search' : 'No customers yet'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            {query ? 'Try a different name, phone, or address' : 'Add your first customer to get started'}
          </div>
          {!query && (
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setShowForm(true)}>
              + Add Customer
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(c => (
            <div
              key={c.id}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '0.875rem 1rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
              }}
              onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: '#fff',
              }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  {c.firstName} {c.lastName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.city && <span>📍 {c.city}{c.state ? `, ${c.state}` : ''}</span>}
                  {c.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>✉️ {c.email}</span>}
                </div>
              </div>

              {/* Appointment count */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: (c._count?.appointments || 0) > 0 ? 'var(--accent)' : 'var(--text-muted)',
                  background: (c._count?.appointments || 0) > 0 ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                  border: '1px solid var(--border)', borderRadius: 9999,
                  padding: '2px 8px',
                }}>
                  {c._count?.appointments || 0} appt{(c._count?.appointments || 0) !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {fmt(c.updatedAt)}
                </div>
              </div>
            </div>
          ))}

          {/* Expanded detail panel */}
          {selectedCustomer && (
            <CustomerCRMView
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              handleNewAppointment={handleNewAppointment}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default CustomersPage;
