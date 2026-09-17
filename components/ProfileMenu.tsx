'use client';

import { useEffect, useRef, useState } from 'react';

interface ProfileMenuProps {
    user: { identifier: string; name: string };
    onLogout: () => void;
    setToast?: (message: string) => void;
}

export default function ProfileMenu({ user, onLogout, setToast }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const initials = (user.name || user.identifier).slice(0, 1).toUpperCase();

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setIsPasswordOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const openPasswordDialog = () => {
        setMessage('');
        setIsPasswordOpen(true);
        setIsOpen(false);
    };

    const closePasswordDialog = () => {
        setMessage('');
        setIsPasswordOpen(false);
    };

    const handlePasswordChange = async (event: React.FormEvent) => {
        event.preventDefault();
        if (newPassword.length < 6) {
            setMessage('New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage('New passwords do not match.');
            return;
        }
        const response = await fetch('/api/auth/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: user.identifier, currentPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || 'Could not change password.');
            return;
        }
        if (setToast) {
            setToast('Password changed successfully! ✅');
            setTimeout(() => setToast(''), 3000);
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        closePasswordDialog();
    };


    return (
        <div className="profile-menu" ref={menuRef}>
            <button type="button" className="profile-trigger" onClick={() => setIsOpen(open => !open)} aria-expanded={isOpen}>
                <span className="profile-avatar">{initials}</span>
                <span className="profile-name">{user.name || user.identifier}</span>
                <span className="profile-chevron">⌄</span>
            </button>
            {isOpen && (
                <div className="profile-dropdown">
                    <div className="profile-dropdown-identity"><strong>{user.name || user.identifier}</strong><small>{user.identifier}</small></div>
                    <button type="button" onClick={openPasswordDialog}>Change password</button>
                    <button type="button" className="profile-logout" onClick={onLogout}>Log out</button>
                </div>
            )}
            {isPasswordOpen && (
                <div className="profile-password-backdrop" role="dialog" aria-modal="true" aria-label="Change password">
                    <form className="profile-password-dialog" onSubmit={handlePasswordChange}>
                        <div className="profile-password-heading"><div><span className="dashboard-kicker">Account security</span><h2>Change password</h2></div><button type="button" onClick={closePasswordDialog} aria-label="Close">×</button></div>
                        <label>Current password<input type="password" value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); setMessage(''); }} required /></label>
                        <label>New password<input type="password" value={newPassword} onChange={event => { setNewPassword(event.target.value); setMessage(''); }} required /></label>
                        <label>Confirm new password<input type="password" value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setMessage(''); }} required /></label>
                        {message && <p className="form-error">{message}</p>}
                        <div className="settings-actions"><button className="button" type="submit">Update password</button><button className="modal-secondary" type="button" onClick={closePasswordDialog}>Cancel</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}
