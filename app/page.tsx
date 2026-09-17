'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileMenu from '@/components/ProfileMenu';
import { formatCurrency } from '@/lib/formatting';

export default function Home() {
  const [user, setUser] = useState<{ identifier: string; name: string; isAdmin: boolean } | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<Record<string, Record<string, number>>>({});
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const [isClient, setIsClient] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [toast, setToast] = useState('');
  const [groupNameError, setGroupNameError] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<{ identifier: string; name: string }[]>([]);
  const [splitType, setSplitType] = useState('equal');
  const [memberValues, setMemberValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsClient(true);
    fetch('/api/currency').then(res => res.json()).then(data => setConversionRates(data.rates || {}));
  }, []);

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return code;
    }
  };

  const convertToInr = (currency: string, amount: number) => {
    if (currency === 'INR') return amount;
    return amount * (conversionRates[currency] || 0);
  };
  const [pendingUsers, setPendingUsers] = useState<string[][]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ identifier: string; name: string }[]>([]);

  const router = useRouter();
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.isAdmin) {
        fetch('/api/admin/pending').then(res => res.json()).then(data => setPendingUsers(data.pendingUsers || []));
      } else {
        fetch('/api/users').then(res => res.json()).then(data => setAvailableUsers(data.users || []));
        // Fetch groups where user is member
        fetch('/api/groups/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: parsedUser.identifier })
        }).then(res => res.json()).then(data => {
          setGroups(data.groups || []);
          return fetch('/api/groups/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: parsedUser.identifier })
          });
        }).then(res => res.json()).then(data => {
          setGroupSummaries(Object.fromEntries((data.summaries || []).map((summary: { group: string; net: Record<string, number> }) => [summary.group, summary.net])));
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleCreateGroup = async () => {
    if (!user) return;
    const trimmedGroupName = newGroupName.trim();
    if (!trimmedGroupName) {
      setGroupNameError('Enter a group name to continue.');
      return;
    }
    setGroupNameError('');
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName: trimmedGroupName,
        creatorIdentifier: user.identifier,
        members: [...selectedMembers.map(m => m.identifier), user.identifier],
        splitType: selectedMembers.length > 0 ? splitType : 'equal',
        memberValues
      }),
    });
    if (res.ok) {
      setGroups([...groups, trimmedGroupName]);
      setIsModalOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      setMemberValues({});
    } else {
      alert('Failed to create group');
    }
  };

  const handleApprove = async (userToApprove: string[]) => {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: userToApprove[0],
        password: userToApprove[1],
        name: userToApprove[2]
      }),
    });
    if (res.ok) {
      alert('User approved successfully!');
      setPendingUsers(pendingUsers.filter(u => u[0] !== userToApprove[0]));
    } else {
      alert('Failed to approve user');
    }
  };

  if (!user) return <div className="page-loading"><img src="/logo.png" alt="SimplySplit" width={46} height={46} /><p>Loading your space...</p></div>;

  return (
    <div className="container home-shell">
      <header className="app-topbar">
        <div className="brand-lockup"><img src="/logo.png" alt="SimplySplit" width={34} height={34} /><span>SimplySplit</span></div>
        <ProfileMenu user={user} onLogout={() => { localStorage.removeItem('user'); router.push('/login'); }} setToast={setToast} />
      </header>

      <section className="home-intro">
        <span className="dashboard-kicker">{user.isAdmin ? 'Workspace admin' : 'Your shared space'}</span>
        <h1>{user.isAdmin ? 'Admin Panel' : 'Dashboard'}</h1>
        <p>Welcome back, {user.name || user.identifier}. Keep every shared expense easy to follow.</p>
      </section>

      {user.isAdmin ? (
        <div className="home-section">
          <div className="section-heading"><div><span className="section-kicker">Needs attention</span><h2>Pending approvals</h2></div><span className="section-count">{pendingUsers.length}</span></div>
          {pendingUsers.map((u, i) => (
            <div key={i} className="approval-card">
              <div>
                <strong>{u[0]}</strong><br />
                <small>{u[2]}</small>
              </div>
              <button className="button secondary" onClick={() => handleApprove(u)}>Approve</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-section">
          <div className="section-heading"><div><span className="section-kicker">Shared spaces</span><h2>Your groups</h2></div><span className="section-count">{groups.length}</span></div>
          <button className="button secondary create-group-button" onClick={() => setIsModalOpen(true)}><span>＋</span> Create new group</button>
          {groups.length > 0 ? (
            <div className="group-list">{groups.map(group => {
              // Strip the unique username- prefix for display
              const cleanGroupName = group.includes('-') ? group.split('-').slice(1).join('-') : group;
              const isConverted = isClient && localStorage.getItem(`simplysplit-convert-to-inr-${group}`) === 'true';
              
              const entries = Object.entries(groupSummaries[group] || {});
              
              const balances = isConverted
                  ? [{ currency: 'INR', amount: entries.reduce((sum, [curr, amt]) => sum + convertToInr(curr, amt), 0) }]
                  : entries.map(([currency, amount]) => ({ currency, amount }));
              
              const netEntries = balances.filter(({ amount }) => Math.abs(amount) >= 0.01);

              return (
                <a key={group} className="group-card" href={`/groups/${encodeURIComponent(group)}`}>
                  <span className="group-card-icon">✦</span>
                  <span className="group-card-copy"><strong>{cleanGroupName}</strong><small>Shared expense group</small></span>
                  <span className="group-card-balance">
                    {netEntries.length === 0 ? 'Settled' : (
                      <span className={netEntries.every(e => e.amount > 0) ? 'get-back' : netEntries.every(e => e.amount < 0) ? 'owe' : ''}>
                        {netEntries.map(({ currency, amount }, i) => (
                          <span key={currency} className={amount > 0 ? 'get-back' : amount < 0 ? 'owe' : ''} style={{display: 'block'}}>
                             {amount > 0 ? 'You get ' : 'You owe '}
                             {formatCurrency(getCurrencySymbol(currency), Math.abs(amount))}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="group-card-arrow">→</span>
                </a>
              );
            })}</div>
          ) : (
            <div className="empty-state"><span>✦</span><strong>No groups yet</strong><p>Create a shared space for your next trip or household.</p></div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create new group" onMouseDown={() => setIsModalOpen(false)}>
          <div className="card create-group-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Create New Group</h3>
            <input className="create-group-name" type="text" placeholder="Group Name" value={newGroupName} onChange={(e) => { setNewGroupName(e.target.value); setGroupNameError(''); }} required aria-invalid={Boolean(groupNameError)} aria-describedby={groupNameError ? 'group-name-error' : undefined} />
            {groupNameError && <p id="group-name-error" className="form-error">{groupNameError}</p>}

            <h4>Members (Including you)</h4>
            <div className="group-member-list">
              <div className="group-member-row group-member-row-current">
                <span className="group-member-name"><strong>{user.name}</strong><small>You</small></span>
                {selectedMembers.length > 0 && (splitType === 'percentage' || splitType === 'share') && (
                  <div className="group-member-controls">
                    <input
                      className="group-share-input"
                      type="number"
                      placeholder={splitType === 'percentage' ? 'Your %' : 'Your Share'}
                      value={memberValues[user.identifier] || ''}
                      onChange={(e) => setMemberValues({ ...memberValues, [user.identifier]: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="group-add-member">
              <select onChange={(e) => {
                const member = availableUsers.find(u => u.identifier === e.target.value);
                if (member && !selectedMembers.some(m => m.identifier === member.identifier)) {
                  setSelectedMembers([...selectedMembers, member]);
                }
                e.target.value = '';
              }}>
                <option value="">+ Add Co-traveller</option>
                {availableUsers.filter(u => u.identifier !== user.identifier && !selectedMembers.some(m => m.identifier === u.identifier)).map(u => (
                  <option key={u.identifier} value={u.identifier}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="group-member-list group-member-list-added">
              {selectedMembers.map(u => (
                <div key={u.identifier} className="group-member-row">
                  <span className="group-member-name"><strong>{u.name}</strong></span>
                  <div className="group-member-controls">
                    {(splitType === 'percentage' || splitType === 'share') && (
                      <input
                        className="group-share-input"
                        type="number"
                        placeholder={splitType === 'percentage' ? 'Percentage' : 'Share'}
                        value={memberValues[u.identifier] || ''}
                        onChange={(e) => setMemberValues({ ...memberValues, [u.identifier]: e.target.value })}
                      />
                    )}
                    <button className="group-remove-member" type="button" aria-label={`Remove ${u.name}`} onClick={() => setSelectedMembers(selectedMembers.filter(m => m.identifier !== u.identifier))}>×</button>
                  </div>
                </div>
              ))}
            </div>

            {selectedMembers.length > 0 && (
              <>
                <h4>Split Logic</h4>
                <select className="group-split-select" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
                  <option value="equal">Equal Split</option>
                  <option value="percentage">Percentage Split</option>
                  <option value="share">Share Split</option>
                </select>
              </>
            )}

            <div className="group-modal-actions">
              <button className="button" onClick={handleCreateGroup}>Create Group</button>
              <button className="modal-secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
